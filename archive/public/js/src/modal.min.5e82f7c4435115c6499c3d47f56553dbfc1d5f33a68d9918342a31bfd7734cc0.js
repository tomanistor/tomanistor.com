(function(){var $=document.querySelector.bind(document),$$=document.querySelectorAll.bind(document),modal,modalBoxes=$$('.modal-box'),openLinks=$$('.gallery-modal-link'),closeLinks=$$('.close')
function openModal(){modalBoxes.forEach(function(box){box.classList.add('scale-in-center')
box.classList.remove('scale-out-center')})}
function closeModal(){modalBoxes.forEach(function(box){box.classList.remove('scale-in-center')
box.classList.add('scale-out-center')
setTimeout(function(){modal.classList.remove('active')},500)})}
openLinks.forEach(function(link){link.onclick=function(e){e.preventDefault()
modal=$(e.target.getAttribute('href'))
modal.classList.add('active')
openModal()}})
closeLinks.forEach(function(link){link.onclick=function(e){e.preventDefault()
closeModal()}})
window.onclick=function(e){if(e.target===modal){closeModal()}}
document.onkeydown=function(e){if(e.key==='Escape'){closeModal()}}})()