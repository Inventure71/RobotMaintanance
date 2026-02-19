export function setCardBusyState(card, isBusy) {
  if (!card) return;
  card.classList.toggle('is-busy', Boolean(isBusy));
}
