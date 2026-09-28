const yes=document.getElementById("yes");
const no=document.getElementById("no");
const message=document.getElementById("message");
const actions=document.getElementById("actions");
const app=document.getElementById("app");

const noMessages=[
  "NON ? 🤨 Tentative refusée par le comité des sorties.",
  "Erreur 404 : le bouton NON a disparu.",
  "Hmm… cette réponse n’est pas disponible aujourd’hui.",
  "Le système préfère clairement OUI. 😌",
  "Refus enregistré… puis immédiatement annulé.",
  "Tu peux réessayer, mais le résultat risque d’être similaire. 😂",
  "Le bouton NON vient de demander une pause.",
  "Analyse en cours… conclusion : OUI.",
  "Le service des refus est exceptionnellement fermé.",
  "Même l’ordinateur trouve ça suspect. 💻",
  "Alerte : niveau de NON trop élevé.",
  "Nouvelle règle : on retente une fois. 😎",
  "Le serveur répond : « intéressant… mais non au NON ».",
  "Bon… techniquement, tu as cliqué sur NON.",
  "Résultat officiel : tentative numéro suivante.",
  "Le bouton NON a été placé sous surveillance.",
  "C’est courageux d’insister. 😂",
  "Le comité délibère encore…",
  "Verdict provisoire : essaie OUI.",
  "Le système refuse de prendre cette réponse au sérieux.",
  "NON détecté. Humour activé.",
  "Tu viens de débloquer un autre message.",
  "Il semblerait que le bouton NON ait beaucoup trop confiance en lui.",
  "Encore un clic ? D’accord, j’ai encore des messages.",
  "Infini : oui. Les messages aussi. ♾️"
];

let noClickCount=0;

yes.addEventListener("click",()=>{
  app.innerHTML=
    '<div class="icon">✓</div>'+
    '<p class="eyebrow">C’EST PARTI</p>'+
    '<h1>On organise cette sortie ?</h1>'+
    '<p class="sub">On regarde la proposition.</p>'+
    '<div class="actions"><button class="yes" id="continue">CONTINUER</button></div>';

  document.getElementById("continue").onclick=showChoices;
});

no.addEventListener("click",()=>{
  noClickCount++;

  const currentMessage=noMessages[(noClickCount-1)%noMessages.length];
  const round=Math.floor((noClickCount-1)/noMessages.length)+1;

  message.textContent=noClickCount%5===0
    ? currentMessage+" — Et oui, ça continue. ♾️"
    : currentMessage;
  message.dataset.round=round;
  no.textContent="NON ?";

  const rect=actions.getBoundingClientRect();
  const buttonWidth=Math.max(no.offsetWidth,70);
  const buttonHeight=Math.max(no.offsetHeight,50);

  // On calcule une zone sûre : le bouton reste visible même sur petit écran.
  const availableX=Math.max(0,(rect.width-buttonWidth)/2-8);
  const availableY=Math.max(0,(rect.height-buttonHeight)/2-6);
  const x=(Math.random()*2-1)*Math.min(availableX,150);
  const y=(Math.random()*2-1)*Math.min(availableY,42);
  const rotation=(Math.random()*2-1)*7;
  const scale=Math.max(0.42,1-(noClickCount*0.045));

  no.style.position="absolute";
  no.style.left="50%";
  no.style.top="50%";
  no.style.transform=
    "translate(calc(-50% + "+x.toFixed(1)+"px), calc(-50% + "+y.toFixed(1)+"px)) scale("+scale.toFixed(3)+") rotate("+rotation.toFixed(1)+"deg)";
  no.style.transformOrigin="center center";
  no.style.transition="transform .25s cubic-bezier(.2,.8,.2,1)";
});

function showChoices(){
  app.innerHTML=
    '<div class="icon">🎡</div>'+
    '<p class="eyebrow">LA PROPOSITION</p>'+
    '<h1>Mercredi 30 septembre</h1>'+
    '<p class="sub">Vers 14h : fête foraine 🎡<br>'+
    'Puis à 17h : taureaux en ville 🐂<br>'+
    '📍 Saint-Rémy-de-Provence</p>'+
    '<div class="actions">'+
      '<button class="yes" id="continue">ÇA ME VA</button>'+
    '</div>';

  document.getElementById("continue").onclick=()=>showDateForm("🎡 Fête foraine vers 14h → 🐂 Taureaux en ville à 17h");
}

function showDateForm(activity){
  const date="2026-09-30";
  const time="14:00";

  app.innerHTML=
    '<div class="icon">📅</div>'+
    '<p class="eyebrow">SORTIE PROPOSÉE</p>'+
    '<h1>Mercredi 30 septembre</h1>'+
    '<p class="sub">'+escapeHtml(activity)+'<br>📍 Saint-Rémy-de-Provence</p>'+
    '<div class="actions">'+
      '<button class="yes" id="confirm">CONFIRMER LA SORTIE</button>'+
    '</div>'+
    '<p class="form-status" id="formStatus"></p>';

  const status=document.getElementById("formStatus");

  document.getElementById("confirm").onclick=async()=>{
    const confirmButton=document.getElementById("confirm");
    confirmButton.disabled=true;
    confirmButton.textContent="ENREGISTREMENT...";

    if(!window.supabase||typeof SUPABASE_URL==="undefined"||typeof SUPABASE_PUBLISHABLE_KEY==="undefined"){
      status.textContent="La connexion au service n’est pas disponible. Recharge la page.";
      status.className="form-status error";
      confirmButton.disabled=false;
      confirmButton.textContent="CONFIRMER LA SORTIE";
      return;
    }

    const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {error}=await supabaseClient.from("date_responses").insert({activity,date,time});

    if(error){
      console.error(error);
      status.textContent="Impossible d’enregistrer la réponse. Réessaie.";
      status.className="form-status error";
      confirmButton.disabled=false;
      confirmButton.textContent="CONFIRMER LA SORTIE";
      return;
    }

    app.innerHTML=
      '<div class="icon">✓</div>'+
      '<p class="eyebrow">SORTIE CONFIRMÉE</p>'+
      '<h1>C’est noté !</h1>'+
      '<p class="sub">Mercredi 30 septembre<br>'+
      '🎡 Fête foraine vers 14h<br>'+
      '🐂 Taureaux en ville à 17h<br>'+
      '📍 Saint-Rémy-de-Provence</p>'+
      '<p class="sub">À bientôt 👋</p>';
  };
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}