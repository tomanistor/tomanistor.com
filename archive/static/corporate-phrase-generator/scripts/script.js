var phrases = [
  'All it takes is a semicolon.',
  'Well, let\'s throw it through a for loop and see what it spits out.',
  'Tie your shoes before you go out for a run.',
  'Will it run on rails?',
  'Let\'s try to have an object oriented meeting.',
  'Don\'t be so object-oriented.',
  'I\'m working on dialup today.',
  'Does it require a rake?',
  'Gotta run this through Capybara.',
  'Sounds like a breakroom problem.',
  'Don\'t forget to reset the microwave to 0.',
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
  'Just because you put syrup on it doesn\'t make it pancakes.',
  'If you hang out in a barbershop long enough, you\'re bound to get your hair cut.',
  'Don\'t try to put 20lbs of potatoes in a 10lb sack.',
  'Are you going to walk me down this parade or what?',
  'Be a comma, not a period.',
  'Put a paperclip on it.',
  'Can I take a look at your CSS?',
  'Like making cheesecake from scratch.',
  'Happy pre-hump day!',
  'You know, Thursday is really just Wednesday\'s Friday.',
  'It\'s about time to land the plane.',
  'The ball is on my plate.'
]

// Getting random number in array
function newPhrase() {
  var randomNumber = Math.floor(Math.random() * (phrases.length))
  // Assigning random phrase to HTML div
  document.getElementById('phraseDisplay').innerHTML = phrases[randomNumber]
}
