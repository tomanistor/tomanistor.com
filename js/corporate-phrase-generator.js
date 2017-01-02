var phrases = [
  'All it takes is a semi colon.',
  'Well, let\'s throw it through a for loop and see what it spits out.',
  'Gotta tie your shoes before you go out for a run.',
  'Will it run on rails?',
  'Let\'s try to have an object oriented meeting.',
  'Don\'t be so object-oriented.',
  'I\'m working on dialup today.',
  'Does bullshit stick?',
  'Gotta run this through Capybara.',
  'Sounds like a breakroom problem.',
  'Gotta reset the microwave to 0.',
  'Sorry, my pen ran out of ink.',
  'Marker ran dry on that one.',
  'Are the lights coming on or am I going to be in the dark on this one?',
  'Can\'t vote for king, right?',
  'Upload that to the trash can.',
  'Can\'t hike without a compass.',
  'Let\'s add some croutons to this salad.',
  'I like the idea, but let\'s let it congeal over the weekend.',
  'A nickel in hand is worth zero down the drain.',
  'Let\'s circle back to something you said two hours ago.',
  'I\'ll revert next week.',
  'We need to take this discussion offline.',
  'Let\'s park this discussion.',
  'We\'re in violent agreement.',
  'We need to have a prioritization meeting.',
  'Just because you put syrup on it doesn\'t make it pancakes'
]

// Getting random number in array
function newPhrase() {
  var randomNumber = Math.floor(Math.random() * (phrases.length));
  // Assigning random phrase to HTML div
  document.getElementById('phraseDisplay').innerHTML = phrases[randomNumber];
}
