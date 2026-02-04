export function generateFounderAgreementHtml(profile: any, userDetails: any, ambitions: any, coatOfArmsBase64: string, role: string) {
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
        ul { margin-bottom: 15px; }
        li { margin-bottom: 5px; }
        .signature-section { margin-top: 80px; page-break-inside: avoid; }
        .signature-box { border-top: 1px solid #000; padding-top: 10px; display: inline-block; width: 45%; margin-top: 50px; }
        .signature-date { float: right; }
        .ambitions-section { margin-top: 50px; page-break-before: always; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; width: 80%; z-index: -1; }
        .role-box { border: 1px solid #000; padding: 15px; background-color: #f9f9f9; margin: 20px 0; }
        .exit-letter { background-color: #f0f0f0; padding: 20px; margin-top: 20px; border-left: 4px solid #333; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="data:image/png;base64,${coatOfArmsBase64}" class="logo" />
        <h1>Medgründer- og samarbeidsavtale</h1>
        <h2>(Relasjonsbeskyttelse – ikke arbeidsforhold)</h2>
      </div>
  
      <p>Denne avtalen er inngått mellom <strong>LEK-SYSTEMET / AI Innovate AS©</strong> (heretter kalt Selskapet) og <strong>${name}</strong> (heretter kalt Deltakeren).</p>
  
      <h3>1. Avtalens formål</h3>
      <p>Formålet med denne avtalen er å muliggjøre samarbeid uten at det går på bekostning av vennskap eller familierelasjon. Avtalen er en relasjonsbeskyttelse og en tydeliggjøring av risiko, ansvar og roller.</p>
  
      <h3>2. Ikke arbeidsforhold</h3>
      <p>Partene er uttrykkelig enige om at denne avtalen ikke etablerer:</p>
      <ul>
        <li>ansettelsesforhold</li>
        <li>arbeidsgiveransvar</li>
        <li>rettigheter etter arbeidsmiljøloven</li>
        <li>krav på lønn, feriepenger eller oppsigelsesvern</li>
      </ul>
      <p>All innsats skjer på eget initiativ og på egen risiko.</p>
  
      <h3>3. Økonomisk realitet og risiko</h3>
      <p>Deltakeren forstår og aksepterer at:</p>
      <ul>
        <li>dette ikke er en jobb med lønn</li>
        <li>man kan legge ned hundrevis av arbeidstimer uten betaling</li>
        <li>man kan bruke egne penger, tid og ressurser uten å få dette tilbake</li>
        <li>all økonomisk gevinst er avhengig av at Selskapet faktisk lykkes økonomisk</li>
      </ul>
  
      <h3>4. Valg av rolle</h3>
      <p>Deltakeren har valgt følgende samarbeidsform:</p>
      <div class="role-box">
        <strong>${role}</strong>
      </div>
      <p><em>(A – Medgründer med aksjepost eller B – Selvstendig næringsdrivende)</em></p>
  
      <h3>5. Resultatbasert for alle</h3>
      <p>Ingen mottar lønn. All kompensasjon skjer kun gjennom:</p>
      <ul>
        <li>utbytte (eiere)</li>
        <li>fakturering av dokumentert resultat (selvstendig næringsdrivende)</li>
      </ul>
      <p>Aldri på bekostning av Selskapets økonomi.</p>
  
      <h3>6. Sak foran person</h3>
      <p>I arbeidstid representerer partene Selskapets interesser – ikke det personlige forholdet. I privat tid kan begge parter stoppe jobbprat umiddelbart.</p>
  
      <h3>7. Loggføring i gründermodulen</h3>
      <p>Alt arbeid, ideer, fremdrift og planer skal loggføres i systemets gründermodul for å sikre åpenhet og tidlig oppdagelse av gnisninger.</p>
  
      <h3>8. Taushetserklæring (NDA)</h3>
      <p>Deltakeren forplikter seg til full taushet om:</p>
      <ul>
        <li>forretningsmodeller</li>
        <li>ideer og konsepter</li>
        <li>teknologi, kode og systemer</li>
        <li>kunder og samarbeidspartnere</li>
        <li>all intern informasjon</li>
      </ul>
      <p>Dette gjelder også etter at samarbeidet er avsluttet. All immateriell verdi tilhører Selskapet.</p>
  
      <h3>9. Evalueringsperiode – 30 dager</h3>
      <p>Begge parter kan avslutte samarbeidet uten begrunnelse de første 30 dagene.</p>
  
      <h3>10. «Vennskapet foran alt»-regelen</h3>
      <p>Dersom samarbeidet begynner å påvirke relasjonen negativt, skal samarbeidet avsluttes umiddelbart – samme dag. Kun dokumentert opptjent kompensasjon utbetales.</p>

      <h3>11. Selvdefinerte ambisjoner</h3>
      <p>Deltakeren skal selv beskrive:</p>
      <ul>
          <li>Hva de ønsker å bidra med</li>
          <li>Mål 30 dager</li>
          <li>Mål 1 år</li>
          <li>5 års visjon</li>
      </ul>
  
      <h3>12. Refleksjon før signering</h3>
      <p>Avtalen kan ikke signeres før 2 minutter (test) etter at den er lest.</p>
  
      <div class="signature-section">
        <p>Denne avtalen er signert digitalt etter minimum 2 minutters (test) tenkepause.</p>
        
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
        <p><strong>5 års visjon:</strong><br>${ambitions.goal_5_years}</p>
        
        <h3>Standardbrev ved avslutning (vennskapet foran alt)</h3>
        <div class="exit-letter">
          <p>Viser til denne avtalen. I henhold til punkt 10 avsluttes samarbeidet med umiddelbar virkning for å bevare relasjonen.</p>
          <p>Kun dokumentert opptjent kompensasjon utbetales.</p>
          <p>Vi går tilbake til å være venner/familie uten profesjonell bagasje.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }