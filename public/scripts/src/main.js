// $(document).ready(function() {
//
//   // Nav is fixed to top
//   $('nav').addClass('nav-fixed');
//   $('nav > div.logo').css('visibility','visible').fadeIn();
//   $('nav > div.nav-toggle').css('visibility','visible').fadeIn();
//
//   // Full screen nav open on click
//   $('.nav-icon').click(function(){
//     $(".nav-full").toggleClass('active');
//     $('main').toggleClass('active');
//     $(this).find('img').toggle();
//   });
//
//   // Full screen nav close on link click
//   $('.nav-full').find('a').click(function(){
//     $('.nav-full').toggleClass('active');
//     $('main').toggleClass('active');
//     $('.nav-icon').find('img').toggle();
//   });
//
//   // Highlight.js initialization
//   $('pre code').each(function(i, block) {
//     hljs.highlightBlock(block);
//   });
//
// });

var toggle = function(el) {
  // If element is visible, hide it
  if (window.getComputedStyle(el).visibility === 'visible') {
    el.style.visibility = 'hidden';
    el.classList.add('hide').classList.remove('show');
    return;
  }

  // If element is hidden, show it
  el.style.visibility = 'visible';
  el.classList.add('show').classList.remove('hide');
};

(function() {
  // Nav is fixed to top
  document.getElementsByTagName('nav').classList.add('nav-fixed');

  document.querySelectorAll('nav > div.logo, nav > div.nav-toggle').style.visibility = 'visible'.classList.add('show').classList.remove('hide');


  // Full screen nav open on click
  document.getElementsByClassName('.nav-icon').addEventListener('click', function() {
    document.querySelectorAll('.nav-full, main').classList.toggle('active');
    this.getElementsByTagName('img').classList.toggle('img');
  });


  // Full screen nav close on click
  document.querySelectorAll('.nav-full a').addEventListener('click', function() {
    document.querySelectorAll('.nav-full, main').classList.toggle('active');
    this.getElementsByTagName('nav-icon').classList.toggle('nav-icon');
  });


  // Highlight.js initialization
  document.querySelectorAll('pre code').forEach(function(i, block) {
    hljs.highlightBlock(block);
  });

})();
