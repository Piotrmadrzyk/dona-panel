const base = $('Formatuj wynik galaz').first().json || {};
const context = $('Przygotuj wynik procesu').first().json || {};
const processResult = $input.first() ? $input.first().json : {};
const hasContext = context.hasTaskContext === true;
const processSaved = hasContext ? processResult.ok === true && processResult.processSaved === true : null;
let answer = String(base.answer || '');
if (hasContext && !processSaved) answer += '\n\nSystem nie potwierdził przypisania tego wyniku do etapu. Etap nie został zamknięty; odśwież panel przed ponowieniem.';
const response = {ok:base.ok === true && (!hasContext || processSaved), answer};
if (hasContext) {
  response.processSaved = processSaved;
  response.taskStatus = String(processResult.taskStatus || '');
  response.processError = processSaved ? '' : String(processResult.errorCode || 'PROCESS_WRITE_NOT_CONFIRMED');
}
return [{json:response}];
