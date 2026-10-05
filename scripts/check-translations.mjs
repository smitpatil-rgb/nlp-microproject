import fs from 'node:fs';
const base = process.env.LINGUAFLOW_URL || 'http://localhost:3003';
const samples = {
  en: 'Can you send the report tomorrow? I do not need it today.',
  fr: "Pouvez-vous envoyer le rapport demain ? Je n'en ai pas besoin aujourd'hui.",
  es: '¿Puede enviar el informe mañana? No lo necesito hoy.',
  hi: 'क्या आप कल रिपोर्ट भेज सकते हैं? मुझे आज इसकी जरूरत नहीं है।',
};
const cases = Object.entries(samples).flatMap(([sourceLanguage,text]) => Object.keys(samples).filter(targetLanguage => sourceLanguage !== targetLanguage).map(targetLanguage => ({sourceLanguage,targetLanguage,text})));
cases.push({sourceLanguage:'fr',targetLanguage:'en',text:"Désolé, vous savez qu'il y a un bon restaurant à proximité où vous avez de la nourriture locale ?"});
const results = [];
for (const body of cases) {
  const response = await fetch(`${base}/api/translate`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  const output = await response.json();
  results.push({...body,status:response.status,...output});
  console.log(JSON.stringify(results.at(-1)));
}
fs.mkdirSync('outputs',{recursive:true});
fs.writeFileSync('outputs/translation-regression.json',JSON.stringify({note:'Live outputs for human semantic review. HTTP success is not an accuracy score.',results},null,2));
if (results.some(r => r.status !== 200 || !r.translation?.trim())) process.exitCode = 1;
