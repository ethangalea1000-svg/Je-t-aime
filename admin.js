let supabase=null;
let sessionUserId=null;
let appReady=false;

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

function getErrorMessage(error){
  if(!error)return "Erreur inconnue.";
  return (error.message||"Erreur Supabase.")+(error.code?" ["+error.code+"]":"");
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatDate(value){
  return new Date(value+"T00:00:00").toLocaleDateString("fr-FR",{
    weekday:"short",day:"numeric",month:"short",year:"numeric"
  });
}

function formatReceived(value){
  return new Date(value).toLocaleString("fr-FR",{
    day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"
  });
}

function showOnly(view){
  loginPanel.classList.add("hidden");
  dashboard.classList.add("hidden");

  if(view==="login")loginPanel.classList.remove("hidden");
  if(view==="dashboard")dashboard.classList.remove("hidden");
}

async function isAdmin(userId){
  const {data,error}=await supabase
    .from("date_admins")
    .select("user_id")
    .eq("user_id",userId)
    .maybeSingle();

  if(error)return {ok:false,error};
  return {ok:!!data,error:null};
}

function updateStats(rows){
  count.textContent=rows.length;
  const today=new Date().toISOString().slice(0,10);
  const upcoming=rows.filter(row=>row.date>=today);
  nextDate.textContent=upcoming.length?formatDate(upcoming[0].date):"—";
}

function renderRows(rows){
  if(!rows.length){
    responsesBody.innerHTML='<tr><td colspan="5" class="empty">Aucune réponse pour le moment.</td></tr>';
    return;
  }

  responsesBody.innerHTML=rows.map(row=>{
    return "<tr>"+
      "<td><span class=\"badge\">"+escapeHtml(row.activity)+"</span></td>"+
      "<td>"+formatDate(row.date)+"</td>"+
      "<td><strong>"+escapeHtml(String(row.time).slice(0,5))+"</strong></td>"+
      "<td>"+formatReceived(row.created_at)+"</td>"+
      "<td><button type=\"button\" class=\"secondary delete-response\" data-id=\""+escapeHtml(row.id)+"\">SUPPRIMER</button></td>"+
    "</tr>";
  }).join("");

  document.querySelectorAll(".delete-response").forEach(button=>{
    button.addEventListener("click",()=>deleteResponse(button.dataset.id));
  });
}

async function loadResponses(){
  if(!supabase||!sessionUserId)return;

  setStatus(dashboardStatus,"Actualisation...");
  responsesBody.innerHTML='<tr><td colspan="5" class="empty">Chargement...</td></tr>';

  const {data,error}=await supabase
    .from("date_responses")
    .select("id,activity,date,time,created_at")
    .order("date",{ascending:true})
    .order("time",{ascending:true});

  if(error){
    console.error("Chargement réponses:",error);
    responsesBody.innerHTML='<tr><td colspan="5" class="empty">Impossible de charger les réponses.</td></tr>';
    setStatus(dashboardStatus,getErrorMessage(error),"error");
    return;
  }

  updateStats(data||[]);
  renderRows(data||[]);
  setStatus(dashboardStatus,"Dernière actualisation : "+new Date().toLocaleTimeString("fr-FR"),"success");
}

async function deleteResponse(id){
  if(!id||!supabase)return;
  if(!window.confirm("Supprimer définitivement cette réponse ?"))return;

  const button=document.querySelector('.delete-response[data-id="'+CSS.escape(id)+'"]');
  if(button){
    button.disabled=true;
    button.textContent="SUPPRESSION...";
  }

  const {error}=await supabase
    .from("date_responses")
    .delete()
    .eq("id",id);

  if(error){
    console.error("Suppression:",error);
    setStatus(dashboardStatus,getErrorMessage(error),"error");
    if(button){
      button.disabled=false;
      button.textContent="SUPPRIMER";
    }
    return;
  }

  await loadResponses();
  setStatus(dashboardStatus,"Réponse supprimée.","success");
}

async function openForSession(session){
  if(!session||!session.user){
    sessionUserId=null;
    showOnly("login");
    setStatus(loginStatus,"Connecte-toi pour accéder à l'administration.");
    return;
  }

  sessionUserId=session.user.id;

  const adminCheck=await isAdmin(session.user.id);

  if(adminCheck.error){
    console.error("Droits admin:",adminCheck.error);
    sessionUserId=null;
    showOnly("login");
    setStatus(loginStatus,"Impossible de vérifier les droits administrateur. Réessaie.");
    return;
  }

  if(!adminCheck.ok){
    await supabase.auth.signOut();
    sessionUserId=null;
    showOnly("login");
    setStatus(loginStatus,"Ce compte n'a pas accès à l'administration.","error");
    return;
  }

  showOnly("dashboard");
  await loadResponses();
}

async function startAdmin(){
  showOnly("login");
  setStatus(loginStatus,"Vérification de la session...", "success");

  try{
    if(!window.supabase)throw new Error("Supabase JS ne s'est pas chargé.");
    if(typeof SUPABASE_URL==="undefined"||typeof SUPABASE_PUBLISHABLE_KEY==="undefined"){
      throw new Error("Configuration Supabase introuvable.");
    }

    supabase=window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:false
        }
      }
    );

    // Une seule lecture de session au démarrage.
    // Aucun événement INITIAL_SESSION/TOKEN_REFRESHED ne change l'écran.
    const sessionPromise=supabase.auth.getSession();
    const timeoutPromise=new Promise((_,reject)=>{
      setTimeout(()=>reject(new Error("La vérification de session prend trop de temps.")),5000);
    });

    const {data,error}=await Promise.race([sessionPromise,timeoutPromise]);
    if(error)throw error;

    await openForSession(data.session);

    // Seule une vraie déconnexion change l'écran.
    supabase.auth.onAuthStateChange(event=>{
      if(event==="SIGNED_OUT"){
        sessionUserId=null;
        showOnly("login");
        setStatus(loginStatus,"Déconnecté.");
      }
    });

    appReady=true;
  }catch(error){
    console.error("Administration:",error);
    showOnly("login");
    setStatus(loginStatus,getErrorMessage(error),"error");
  }
}

loginForm.addEventListener("submit",async event=>{
  event.preventDefault();

  if(!supabase){
    setStatus(loginStatus,"Initialisation de la connexion...","error");
    return;
  }

  const email=document.getElementById("email").value.trim();
  const password=document.getElementById("password").value;

  if(!email||!password){
    setStatus(loginStatus,"Entre ton email et ton mot de passe.","error");
    return;
  }

  loginButton.disabled=true;
  loginButton.textContent="CONNEXION...";
  setStatus(loginStatus,"Connexion en cours...","success");

  try{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data.session)throw new Error("Session non créée.");
    await openForSession(data.session);
  }catch(error){
    console.error("Connexion:",error);
    setStatus(loginStatus,getErrorMessage(error),"error");
  }finally{
    loginButton.disabled=false;
    loginButton.textContent="SE CONNECTER";
  }
});

logoutButton.addEventListener("click",async()=>{
  if(supabase)await supabase.auth.signOut();
});

refreshButton.addEventListener("click",loadResponses);

startAdmin();
