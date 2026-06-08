document.addEventListener('click', function (e) {
  var historyBlock = document.querySelector('.history');
  if (!historyBlock) return;
  var trigger = e.target.closest('.menu__link--history');
  if (trigger) {
    e.preventDefault();
    historyBlock.classList.toggle('_active');
  } else if (historyBlock.classList.contains('_active')) {
    historyBlock.classList.remove('_active');
  }
});
