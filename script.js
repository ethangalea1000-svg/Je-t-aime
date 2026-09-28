const yes=document.getElementById("yes");
const no=document.getElementById("no");
const message=document.getElementById("message");
const actions=document.getElementById("actions");
const app=document.getElementById("app");

let attempts=0;
const messages=[
  "J'attends ta réponse 👀",
  "T'es sûr(e) ? 😏",
  "Raté 😂",
  "Encore essayé ?",
  "Ce bouton est rapide aujourd'hui...",
  "Presque !",
  "Tu vas vraiment continuer ? 👀"
];

function escapeNo(){
  attempts++;
  message.textContent=messages[Math.min(attempts,messages.length-1)];

  const box=actions.getBoundingClientRect();
  const button=no.getBoundingClientRect();

  no.style.position="absolute";
  no.style.left=(8+Math.random()*Math.max(8,box.width-button.width-16))+"px";
  no.style.top=(8+Math.random()*Math.max(8,box.height-button.height-16))+"px";
  no.style.transform="rotate("+((Math.random()*16)-8).toFixed(1)+"deg) scale("+Math.max(.82,1-attempts*.025)+")";
}

["mouseenter","pointerdown","touchstart"].forEach(event=>{
  no.addEventListener(event,e=>{
    if(event!=="mouseenter") e.preventDefault();
    escapeNo();
  },{passive:false});
});

no.addEventListener("click",e=>{
  e.preventDefault();
  escapeNo();
});

yes.addEventListener("click",()=>{
  app.innerHTML=
    '<div class="heart">💗</div>'+
    '<p class="eyebrow">C’EST PARTI</p>'+
    '<h1>Alors... on organise ce date ?</h1>'+
    '<p class="sub">Choisis ce qui te ferait plaisir.</p>'+
    '<div class="actions"><button class="yes" id="continue">CONTINUER ✨</button></div>';

  document.getElementById("continue").onclick=showChoices;
});

function showChoices(){
  app.innerHTML=
    '<div class="heart">✨</div>'+
    '<p class="eyebrow">LE PROGRAMME</p>'+
    '<h1>Tu préfères quoi ?</h1>'+
    '<p class="sub">Choisis une idée pour le date.</p>'+
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
    '<div class="heart">🥰</div>'+
    '<p class="eyebrow">RENDEZ-VOUS</p>'+
    '<h1>Parfait 💗</h1>'+
    '<p class="sub">Il ne reste plus qu’à choisir le jour et l’heure ensemble.</p>'+
    '<div class="form">'+
      '<label>📅 Quel jour ?<input id="date" type="date" required></label>'+
      '<label>🕐 À quelle heure ?<input id="time" type="time" required></label>'+
      '<button class="yes" id="confirm">CONFIRMER LE DATE 💞</button>'+
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
      status.textContent="Choisis le jour et l’heure avant de confirmer 💗";
      status.className="form-status error";
      return;
    }

    const confirmButton=document.getElementById("confirm");
    confirmButton.disabled=true;
    confirmButton.textContent="ENREGISTREMENT...";

    const {error}=await supabaseClient
      .from("date_responses")
      .insert({
        activity,
        date,
        time
      });

    if(error){
      console.error(error);
      status.textContent="Impossible d’enregistrer la réponse. Réessaie.";
      status.className="form-status error";
      confirmButton.disabled=false;
      confirmButton.textContent="CONFIRMER LE DATE 💞";
      return;
    }

    const formatted=new Date(date+"T00:00:00").toLocaleDateString("fr-FR",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });

    app.innerHTML=
      '<div class="heart">💞</div>'+
      '<p class="eyebrow">DATE CONFIRMÉ</p>'+
      '<h1>C’est réservé !</h1>'+
      '<p class="sub">✨ '+escapeHtml(activity)+'<br>📅 '+formatted+'<br>🕐 '+time+'</p>'+
      '<p class="sub">À très bientôt 💗</p>';
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