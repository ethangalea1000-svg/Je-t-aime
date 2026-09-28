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
    '<p class="sub">Choisis ce qui te ferait plaisir.</p>'+
    '<div class="actions"><button class="yes" id="continue">CONTINUER</button></div>';

  document.getElementById("continue").onclick=showChoices;
});

no.addEventListener("click",()=>{
  noClickCount++;

  const currentMessage=noMessages[(noClickCount-1)%noMessages.length];
  const round=Math.floor((noClickCount-1)/noMessages.length)+1;

  message.textContent=currentMessage;
  message.dataset.round=round;

  if(noClickCount%5===0){
    message.textContent=currentMessage+" — Et oui, ça continue. ♾️";
  }

  no.textContent=noClickCount>1
    ? "NON ?"
    : "NON";

  // Le bouton rétrécit progressivement.
  const scale=Math.max(0.24,1-(noClickCount*0.055));

  // Puis il change de place à chaque clic, dans une zone contrôlée.
  const maxX=Math.min(150,90+noClickCount*3);
  const maxY=Math.min(30,10+noClickCount*1.5);
  const x=Math.round((Math.random()*2-1)*maxX);
  const y=Math.round((Math.random()*2-1)*maxY);
  const rotation=Math.round((Math.random()*2-1)*8);

  no.style.position="absolute";
  no.style.left="50%";
  no.style.top="50%";
  no.style.transform=
    "translate(calc(-50% + "+x+"px), calc(-50% + "+y+"px)) scale("+scale+") rotate("+rotation+"deg)";
  no.style.transformOrigin="center center";
  no.style.transition="transform .28s ease";
});

function showChoices(){
  app.innerHTML=
    '<div class="icon">✦</div>'+
    '<p class="eyebrow">LE PROGRAMME</p>'+
    '<h1>Tu préfères quoi ?</h1>'+
    '<p class="sub">Choisis une idée de sortie.</p>'+
    '<div class="actions choices" style="height:auto;flex-wrap:wrap">'+
      '<button class="yes choice">🎬 Ciné</button>'+
      '<button class="yes choice">🍕 Manger</button>'+
      '<button class="yes choice">🚶 Balade</button>'+
      '<button class="yes choice">🎲 Activité</button>'+
    '</div>';

  document.querySelectorAll(".choice").forEach(button=>{
    button.onclick=()=>showDateForm(button.textContent.trim());
  });
}

function showDateForm(activity){
  app.innerHTML=
    '<div class="icon">📅</div>'+
    '<p class="eyebrow">ORGANISATION</p>'+
    '<h1>Quand est-ce qu’on fait ça ?</h1>'+
    '<p class="sub">Choisis le jour et l’heure.</p>'+
    '<div class="form">'+
      '<label>Quel jour ?<input id="date" type="date" required></label>'+
      '<label>À quelle heure ?<input id="time" type="time" required></label>'+
      '<button class="yes" id="confirm">CONFIRMER LA SORTIE</button>'+
      '<p class="form-status" id="formStatus"></p>'+
    '</div>';

  const dateInput=document.getElementById("date");
  const timeInput=document.getElementById("time");
  const status=document.getElementById("formStatus");

  dateInput.min=new Date().toISOString().split("T")[0];

  document.getElementById("confirm").onclick=async()=>{
    const date=dateInput.value;
    const time=timeInput.value;

    if(!date||!time){
      status.textContent="Choisis le jour et l’heure avant de confirmer.";
      status.className="form-status error";
      return;
    }

    const confirmButton=document.getElementById("confirm");
    confirmButton.disabled=true;
    confirmButton.textContent="ENREGISTREMENT...";

    const {error}=await supabaseClient
      .from("date_responses")
      .insert({activity,date,time});

    if(error){
      console.error(error);
      status.textContent="Impossible d’enregistrer la réponse. Réessaie.";
      status.className="form-status error";
      confirmButton.disabled=false;
      confirmButton.textContent="CONFIRMER LA SORTIE";
      return;
    }

    const formatted=new Date(date+"T00:00:00").toLocaleDateString("fr-FR",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });

    app.innerHTML=
      '<div class="icon">✓</div>'+
      '<p class="eyebrow">SORTIE CONFIRMÉE</p>'+
      '<h1>C’est noté !</h1>'+
      '<p class="sub">'+escapeHtml(activity)+'<br>📅 '+formatted+'<br>🕐 '+time+'</p>'+
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
