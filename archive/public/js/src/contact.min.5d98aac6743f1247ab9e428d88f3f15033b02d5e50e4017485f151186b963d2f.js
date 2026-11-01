(function(){var $=document.querySelector.bind(document)
$('#form-contact').addEventListener('submit',function(e){e.preventDefault()
var name=$('input[name=name]').value,email=$('input[name=email]').value,subject=$('input[name=_subject]').value,message=$('textarea[name=message]').value,request=new XMLHttpRequest(),data={name:name,_replyto:email,email:email,_subject:subject,message:message}
request.open('POST','https://formspree.io/toma@tomanistor.com',true)
request.setRequestHeader('Content-Type','application/json')
request.setRequestHeader('Accept','application/json')
request.onreadystatechange=function(){if(request.readyState===4&&request.status===200){$('#form-contact').reset()
var submit=$('#form-submit'),thanks=$('#form-thankyou')
function thankYouFadeIn(){submit.style.visibility='hidden'
submit.classList.add('hide')
submit.classList.remove('show')
thanks.style.visibility='visible'
thanks.classList.add('show')
thanks.classList.remove('hide')
setTimeout(thankYouFadeOut,6000)};function thankYouFadeOut(){thanks.style.visibility='hidden'
thanks.classList.add('hide')
thanks.classList.remove('show')
submit.style.visibility='visible'
submit.classList.add('show')
submit.classList.remove('hide')};thankYouFadeIn()}}
request.send(JSON.stringify(data))})})()