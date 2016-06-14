document.addEventListener('DOMContentLoaded', function() {
  var strangeOrbitsDiv,
    introDiv,
    progressDiv,
    strangeOrbits,
    transitionDuration,
    holdDuration,
    totalDuration,
    slides,
    clock,
    index,
    resizeHandler,
    loop;

  // Elements
  strangeOrbitsDiv = document.querySelector('.strangeorbits');
  introDiv = document.querySelector('.intro');
  progressDiv = document.querySelector('.progress');

  // StrangeOrbits
  strangeOrbits = new StrangeOrbits(strangeOrbitsDiv, {
    color: 'red'
  });

  // Properties
  transitionDuration = 3000;
  holdDuration = 10000;
  totalDuration = transitionDuration + holdDuration;
  slides = [
    'img/s.png',
    'img/pentagon.png',
    'img/github.png'
  ];

  // State variables
  clock = transitionDuration + holdDuration;
  index = 0;

  // Layout
  resizeHandler = function() {
    introDiv.style.marginTop = -introDiv.offsetHeight / 2 + 'px';
  };

  // Loop
  loop = function() {
    if (clock >= totalDuration) {
      clock = 0;

      strangeOrbits.showFigure(slides[index], 3000);

      index = index < slides.length - 1 ? index + 1 : 0;
    } else {
      clock += 16;
    }

    progressDiv.style.width = (100 / totalDuration * clock) + "%";
  };

  // Start
  resizeHandler();
  window.addEventListener('resize', resizeHandler);
  window.addEventListener('touchmove', function(event) {
    event.preventDefault();
  });
  strangeOrbits.start();
  loop();
  setInterval(loop, 16);
}, false);
