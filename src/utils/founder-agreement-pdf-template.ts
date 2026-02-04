export function generateFounderAgreementHtml(profile: any, userDetails: any, ambitions: any, coatOfArmsBase64: string) {
    const signedDate = new Date(profile.signed_at).toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' });
    const name = userDetails.full_name || userDetails.email;
  
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: "Times New Roman", serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { text-align: center; margin-bottom: 60px; }
        .logo { width: 150px; height: auto; margin-bottom: 20px; }
        h1 { font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        h2 { font-size: 20px; font-style: italic; font-weight: normal; margin-bottom: 40px; color: #4a4a4a; }
        h3 { font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        p { margin-bottom: 15px; text-align: justify; }
        .signature-section { margin-top: 80px; page-break-inside: avoid; }
        .signature-box { border-top: 1px solid #000; padding-top: 10px; display: inline-block; width: 45%; margin-top: 50px; }
        .signature-date { float: right; }
        .ambitions-section { margin-top: 50px; page-break-before: always; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; width: 80%; z-index: -1; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="data:image/png;base64,${coatOfArmsBase64}" class="logo" />
        <h1>Venne- og familiebeskyttelsesavtale</h1>
        <h2>"Vennskapet foran alt"</h2>
      </div>
  
      <p>Denne avtalen er inngått mellom <strong>${name}</strong> og <strong>LEK-Biens Vokter Gründerteam</strong>.</p>
  
      <h3>1. Formål</h3>
      <p>Denne avtalen finnes av én grunn: Å sikre at vi kan fortsette å være venner/familie uansett hva som skjer i samarbeidet i LEK-systemet.</p>
  
      <h3>2. Forståelse av risiko</h3>
      <p>Dette er ikke en jobb med lønn eller garantier. Jeg forstår at jeg kan komme til å legge ned hundrevis av arbeidstimer uten å tjene penger. Min økonomiske fremgang er utelukkende avhengig av min egen innsats, ideer og resultater.</p>
  
      <h3>3. Frivillig deltakelse</h3>
      <p>Jeg bekrefter at jeg deltar av egen fri vilje, uten press, forventning eller påvirkning.</p>
  
      <h3>4. Arbeidstid vs privat tid</h3>
      <p>I arbeidstiden representerer vi LEK-systemet. I privat tid representerer vi kun vårt vennskap/familieforhold. Begge parter kan når som helst stoppe jobbprat i sosiale settinger.</p>
  
      <h3>5. Ingen særfordeler</h3>
      <p>Å være venn eller familie gir ingen fordeler i systemet. Det stilles tvert imot høyere krav til ryddighet og profesjonalitet.</p>
  
      <h3>6. Loggføring i gründermodulen</h3>
      <p>Alt arbeid, ideer, planer og fremdrift skal loggføres i gründermodulen. Dette er for å sikre åpenhet og for å fange opp gnisninger tidlig.</p>
  
      <h3>7. Vennskapet foran alt-regelen</h3>
      <p>Dersom en av partene opplever at samarbeidet påvirker relasjonen negativt, skal samarbeidet avsluttes samme dag. Uten konflikt. Uten diskusjon. Kun for å bevare relasjonen.</p>
  
      <div class="signature-section">
        <p>Denne avtalen er signert digitalt etter minimum 48 timers tenkepause.</p>
        
        <div class="signature-box">
          <strong>${name}</strong><br>
          Signert digitalt
        </div>
        
        <div class="signature-box signature-date">
          <strong>Dato:</strong> ${signedDate}
        </div>
      </div>
  
      <div class="ambitions-section">
        <h3>Vedlegg: Mine ambisjoner</h3>
        <p><strong>Hva jeg vil bidra med:</strong><br>${ambitions.contribution}</p>
        <p><strong>Mål om 30 dager:</strong><br>${ambitions.goal_30_days}</p>
        <p><strong>Mål om 1 år:</strong><br>${ambitions.goal_1_year}</p>
      </div>
    </body>
    </html>
    `;
  }
