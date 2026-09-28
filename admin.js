let supabase;

const loginPanel=document.getElementById("loginPanel");
const dashboard=document.getElementById("dashboard");
const loginForm=document.getElementById("loginForm");
const loginStatus=document.getElementById("loginStatus");
const loginButton=document.getElementById("loginButton");
const logoutButton=document.getElementById("logoutButton");
const refreshButton=document.getElementById("refreshButton");
const responsesBody=document.getElementById("responsesBody");
const count=document.getElementById("count");
const nextDate=document.getElementById("nextDate");
const dashboardStatus=document.getElementById("dashboardStatus");

function setStatus(element,textValue,type=""){
  if(!element)return;
  element.textContent=textValue;
  element.className="status "+type;
}

function formatDate(value){
  return new Date(value+"T00:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
}

function formatReceived(value){
  return new Date(value).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function showLogin(){
  loginPanel.classList.remove("hidden");
  dashboard.classList.add("hidden");
}

function showDashboard(){
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function getSupabaseError(error){
  if(!error)return "Erreur inconnue.";
  return (error.message||"Erreur Supabase.")+(error.code?" ["+error.code+"]":"");
}

async function isAdmin(userId){
  const {data,error}=await supabase
    .from("date_admins")
    .select("user_id")
    .eq("user_id",userId)
    .maybeSingle();

  if(error){
    console.error("Vérification admin:",error);
    return {ok:false,error};
  }
  return {ok:!!data,error:null};
}

async function loadResponses(){
  setStatus(dashboardStatus,"Chargement...");
  responsesBody.innerHTML="<tr><td colspan=\"4\" class=\"empty\">Chargement...</td></tr>";

  const {data,error}=await supabase
    .from("date_responses")
    .select("id,activity,date,time,created_at")
    .order("date",{ascending:true})
    .order("time",{ascending:true});

  if(error){
    console.error("Chargement réponses:",error);
    responsesBody.innerHTML="<tr><td colspan=\"4\" class=\"empty\">Impossible de charger les réponses.</td></tr>";
    setStatus(dashboardStatus,getSupabaseError(error),"error");
    return;
  }

  count.textContent=data.length;
  const today=new Date().toISOString().slice(0,10);
  const upcoming=data.filter(row=>row.date>=today);
  nextDate.textContent=upcoming.length?formatDate(upcoming[0].date):"—";

  if(!data.length){
    responsesBody.innerHTML="<tr><td colspan=\"4\" class=\"empty\">Aucune réponse pour le moment.</td></tr>";
    setStatus(dashboardStatus,"Aucune réponse enregistrée.");
    return;
  }

  responsesBody.innerHTML=data.map(row=>
    "<tr><td><span class=\"badge\">"+escapeHtml(row.activity)+"</span></td>"+
    "<td>"+formatDate(row.date)+"</td>"+
    "<td><strong>"+escapeHtml(row.time.slice(0,5))+"</strong></td>"+
    "<td>"+formatReceived(row.created_at)+"</td><td><button class=\"secondary delete-response\" data-id=\""+escapeHtml(row.id)+"\">Supprimer</button></td></tr>"
  ).join("");

  document.querySelectorAll(".delete-response").forEach(button=>{
    button.addEventListener("click",()=>deleteResponse(button.dataset.id));
  });

  setStatus(dashboardStatus,"Dernière actualisation : "+new Date().toLocaleTimeString("fr-FR"));
}

async function deleteResponse(id){
  if(!id)return;
  if(!window.confirm("Supprimer définitivement cette réponse ?"))return;

  const button=document.querySelector('.delete-response[data-id="'+CSS.escape(id)+'"]');
  if(button){
    button.disabled=true;
    button.textContent="SUPPRESSION...";
  }

  const {error}=await supabase.from("date_responses").delete().eq("id",id);

  if(error){
    console.error("Suppression réponse:",error);
    setStatus(dashboardStatus,getSupabaseError(error),"error");
    if(button){
      button.disabled=false;
      button.textContent="Supprimer";
    }
    return;
  }

  setStatus(dashboardStatus,"Réponse supprimée.","success");
  await loadResponses();
}

async function init(){
  showLogin();
  setStatus(loginStatus,"Initialisation de la connexion...");

  try{
    if(!window.supabase){
      throw new Error("Supabase JS ne s’est pas chargé. Vérifie ta connexion internet puis recharge la page.");
    }

    if(typeof SUPABASE_URL==="undefined"||typeof SUPABASE_PUBLISHABLE_KEY==="undefined"){
      throw new Error("La configuration Supabase est introuvable.");
    }

    supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    setStatus(loginStatus,"Prêt à se connecter.");

    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;

    if(data.session){
      const result=await isAdmin(data.session.user.id);
      if(result.ok){
        showDashboard();
        await loadResponses();
      }else{
        await supabase.auth.signOut();
        if(result.error)setStatus(loginStatus,"Impossible de vérifier les droits admin : "+getSupabaseError(result.error),"error");
        else setStatus(loginStatus,"Ce compte n’a pas accès à l’administration.","error");
      }
    }
  }catch(error){
    console.error("Initialisation:",error);
    setStatus(loginStatus,getSupabaseError(error),"error");
  }
}

loginForm.addEventListener("submit",async(event)=>{
  event.preventDefault();

  if(!supabase){
    setStatus(loginStatus,"La connexion n’est pas initialisée. Recharge la page.","error");
    return;
  }

  const email=document.getElementById("email").value.trim();
  const password=document.getElementById("password").value;

  setStatus(loginStatus,"Le clic est bien détecté. Connexion en cours…","success");
  loginButton.disabled=true;
  loginButton.textContent="CONNEXION...";
  setStatus(loginStatus,"Connexion en cours...");

  try{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});

    if(error)throw error;
    if(!data.user)throw new Error("Supabase n’a renvoyé aucun utilisateur.");

    const result=await isAdmin(data.user.id);

    if(!result.ok){
      await supabase.auth.signOut();
      if(result.error)throw new Error("Droits administrateur impossibles à vérifier : "+getSupabaseError(result.error));
      throw new Error("Connexion réussie, mais ce compte n’a pas accès à l’administration.");
    }

    setStatus(loginStatus,"Connexion réussie.");
    showDashboard();
    await loadResponses();
  }catch(error){
    console.error("Connexion:",error);
    setStatus(loginStatus,getSupabaseError(error),"error");
  }finally{
    loginButton.disabled=false;
    loginButton.textContent="SE CONNECTER";
  }
});

logoutButton.addEventListener("click",async()=>{
  try{
    if(supabase)await supabase.auth.signOut();
  }finally{
    showLogin();
    setStatus(loginStatus,"Déconnecté.");
  }
});

refreshButton.addEventListener("click",loadResponses);

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

window.addEventListener("error",(event)=>{ setStatus(loginStatus,"Erreur JavaScript : "+(event.message||"erreur inconnue"),"error"); });

init();