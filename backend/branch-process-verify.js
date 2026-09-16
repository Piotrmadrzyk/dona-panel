const j = $input.first() ? $input.first().json : {};
if (j.error || j.ok !== true || j.verified !== true) {
  return [{json:{
    ok:false, verified:false, processSaved:false,
    errorCode:String(j.errorCode || (j.error ? 'PROCESS_EXECUTION_FAILED' : 'VERIFICATION_NOT_CONFIRMED')),
    message:String(j.komunikat || 'Nie potwierdzono zmiany etapu. Odśwież panel przed ponowieniem.')
  }}];
}
return [{json:{
  ok:true, verified:true, processSaved:true, changed:j.changed === true,
  taskStatus:String(j.taskStatus || 'VERIFIED'), nextStep:String(j.krok_obecny || ''),
  message:String(j.komunikat || 'Wynik etapu został potwierdzony.')
}}];
