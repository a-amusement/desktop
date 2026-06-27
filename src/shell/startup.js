const log = document.getElementById('debug-log');

function appendEntry(entry) {
  const item = document.createElement('li');
  const time = document.createElement('time');
  const message = document.createElement('span');

  time.textContent = entry.time;
  message.textContent = entry.message;

  item.append(time, message);
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

window.startupLog.onHistory((entries) => {
  log.replaceChildren();
  entries.forEach(appendEntry);
});

window.startupLog.onEntry(appendEntry);
