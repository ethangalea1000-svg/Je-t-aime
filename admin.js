const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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
  element.textContent=textValue;
  element.className="status "+type;
}

function formatDate(value){
  return new Date(value+"T00:00:00").toLocaleDateString("fr-FR",{
    weekday:"short",
    day:"numeric",
    month:"short",
    year:"numeric"
  });
}

function formatReceived(value){
  return new Date(value).toLocaleString("fr-FR",{
    day:"2-digit",
    month:"2-digit",
    year:"numeric",
    hour:"2-digit",
    minute:"2-digit"
  });
}

function showLogin(){
  loginPanel.classList.remove("hidden");
  dashboard.classList.add("hidden");
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
    console.error(error);
    return false;
  }
  return !!data;
}

async function loadResponses(){
  setStatus(dashboardStatus,"Chargement...");
  responsesBody.innerHTML='<tr><td colspan="4" class="empty">Chargement...</td></tr>';

  const {data,error}=await supabase
    .from("date_responses")
    .select("id,activity,date,time,created_at")
    .order("date",{ascending:true})
    .order("time",{ascending:true});

  if(error){
    console.error(error);
    responsesBody.innerHTML='<tr><td colspan="4" class="empty">Impossible de charger les réponses.</td></tr>';
    setStatus(dashboardStatus,error.message,"error");
    return;
  }

  count.textContent=data.length;

  const today=new Date().toISOString().slice(0,10);
  const upcoming=data.filter(row=>row.date>=today);
  nextDate.textContent=upcoming.length?formatDate(upcoming[0].date):"—";

  if(!data.length){
    responsesBody.innerHTML='<tr><td colspan="4" class="empty">Aucune réponse pour le moment.</td></tr>';
    setStatus(dashboardStatus,"Aucune réponse enregistrée.");
    return;
  }

  responsesBody.innerHTML=data.map(row=>`
    <tr>
      <td><span class="badge">${escapeHtml(row.activity)}</span></td>
      <td>${formatDate(row.date)}</td>
      <td><strong>${escapeHtml(row.time.slice(0,5))}</strong></td>
      <td>${formatReceived(row.created_at)}</td>
    </tr>
  `).join("");

  setStatus(dashboardStatus,"Dernière actualisation : "+new Date().toLocaleTimeString("fr-FR"));
}

loginForm.addEventListener("submit",async(event)=>{
  event.preventDefault();
  setStatus(loginStatus,"");
  loginButton.disabled=true;
  loginButton.textContent="CONNEXION...";

  const email=document.getElementById("email").value.trim();
  const password=document.getElementById("password").value;

  const {data,error}=await supabase.auth.signInWithPassword({email,password});

  if(error){
    console.error(error);
    setStatus(loginStatus,"Email ou mot de passe incorrect.","error");
    loginButton.disabled=false;
    loginButton.textContent="SE CONNECTER";
    return;
  }

  const admin=await isAdmin(data.user.id);

  if(!admin){
    await supabase.auth.signOut();
    setStatus(loginStatus,"Ce compte n’a pas accès à l’administration.","error");
    loginButton.disabled=false;
    loginButton.textContent="SE CONNECTER";
    return;
  }

  showDashboard();
  loginButton.disabled=false;
  loginButton.textContent="SE CONNECTER";
  await loadResponses();
});

logoutButton.addEventListener("click",async()=>{
  await supabase.auth.signOut();
  showLogin();
});

refreshButton.addEventListener("click",loadResponses);

supabase.auth.onAuthStateChange(async(_event,session)=>{
  if(!session){
    showLogin();
    return;
  }

  if(await isAdmin(session.user.id)){
    showDashboard();
    await loadResponses();
  }else{
    await supabase.auth.signOut();
    showLogin();
  }
});

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}