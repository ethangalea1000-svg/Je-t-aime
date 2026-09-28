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

function getSupabaseError(error){
  if(!error)return "Erreur inconnue.";
  return (error.message||"Erreur Supabase.")+(error.code?" ["+error.code+"]":"");
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

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function showLogin(message,type=""){
  loginPanel.classList.remove("hidden");
  dashboard.classList.add("hidden");
  if(message)setStatus(loginStatus,message,type);
}

function showDashboard(){
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
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

function updateStats(data){
  count.textContent=data.length;
  const today=new Date().toISOString().slice(0,10);
  const upcoming=data.filter(row=>row.date>=today);
  nextDate.textContent=upcoming.length?formatDate(upcoming[0].date):"—";
}

function renderRows(data){
  if(!data.length){
    responsesBody.innerHTML='<tr><td colspan="5" class="empty">Aucune réponse pour le moment.</td></tr>';
    return;
  }

  responsesBody.innerHTML=data.map(row=>{
    return '<tr>'+
      '<td><span class="badge">'+escapeHtml(row.activity)+'</span></td>'+
      '<td>'+formatDate(row.date)+'</td>'+
      '<td><strong>'+escapeHtml(String(row.time).slice(0,5))+'</strong></td>'+
      '<td>'+formatReceived(row.created_at)+'</td>'+
      '<td><button type="button" class="secondary delete-response" data-id="'+escapeHtml(row.id)+'">SUPPRIMER</button></td>'+
    '</tr>';
  }).join("");

  document.querySelectorAll(".delete-response").forEach(button=>{
    button.addEventListener("click",()=>deleteResponse(button.dataset.id));
  });
}

async function loadResponses(){
  if(!supabase)return;
  setStatus(dashboardStatus,"Chargement des réponses...");
  responsesBody.innerHTML='<tr><td colspan="5" class="empty">Chargement...</td></tr>';

  const {data,error}=await supabase
    .from("date_responses")
    .select("id,activity,date,time,created_at")
    .order("date",{ascending:true})
    .order("time",{ascending:true});

  if(error){
    console.error("Chargement réponses:",error);
    responsesBody.innerHTML='<tr><td colspan="5" class="empty">Impossible de charger les réponses.</td></tr>';
    setStatus(dashboardStatus,getSupabaseError(error),"error");
    return;
  }

  updateStats(data);
  renderRows(data);
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
    console.error("Suppression réponse:",error);
    setStatus(dashboardStatus,getSupabaseError(error),"error");
    if(button){
      button.disabled=false;
      button.textContent="SUPPRIMER";
    }
    return;
  }

  await loadResponses();
  setStatus(dashboardStatus,"Réponse supprimée.","success");
}

async function verifyAndOpen(session){
  if(!session||!session.user){
    showLogin("Session absente. Connecte-toi pour accéder à l'administration.");
    return;
  }

  setStatus(loginStatus,"Session retrouvée — vérification des droits...","success");

  const result=await isAdmin(session.user.id);

  if(result.error){
    showLogin(
      "La session est conservée, mais la vérification des droits a échoué. Réessaie sans te déconnecter.",
      "error"
    );
    return;
  }

  if(!result.ok){
    await supabase.auth.signOut();
    showLogin("Ce compte n’a pas accès à l’administration.","error");
    return;
  }

  showDashboard();
  await loadResponses();
}

async function init(){
  showLogin("Chargement de la dernière version de l'administration...");

  try{
    if(!window.supabase){
      throw new Error("Supabase JS ne s’est pas chargé.");
    }

    if(typeof SUPABASE_URL==="undefined"||typeof SUPABASE_PUBLISHABLE_KEY==="undefined"){
      throw new Error("La configuration Supabase est introuvable.");
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

    supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){
        showLogin("Déconnecté.");
        return;
      }

      if((event==="SIGNED_IN"||event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")&&session){
        setTimeout(()=>verifyAndOpen(session),0);
      }
    });

    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;

    if(data.session){
      await verifyAndOpen(data.session);
    }else{
      showLogin("Aucune session enregistrée. Connecte-toi.");
    }
  }catch(error){
    console.error("Initialisation:",error);
    showLogin(getSupabaseError(error),"error");
  }
}

loginForm.addEventListener("submit",async event=>{
  event.preventDefault();

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
    if(!data.user)throw new Error("Aucun utilisateur retourné.");
    await verifyAndOpen(data.session);
  }catch(error){
    console.error("Connexion:",error);
    setStatus(loginStatus,getSupabaseError(error),"error");
  }finally{
    loginButton.disabled=false;
    loginButton.textContent="SE CONNECTER";
  }
});

logoutButton.addEventListener("click",async()=>{
  await supabase.auth.signOut();
});

refreshButton.addEventListener("click",loadResponses);

window.addEventListener("error",event=>{
  setStatus(loginStatus,"Erreur JavaScript : "+(event.message||"erreur inconnue"),"error");
});

init();
