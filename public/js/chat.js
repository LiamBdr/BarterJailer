let chatBtn = document.querySelector('.chatBtn'),
    chatContainer = document.querySelector('.chatContainer');

chatBtn.addEventListener("click", () => {

    if (chatBtn.classList.contains("open")) {
        chatBtn.classList.remove("open");
        chatBtn.innerHTML = '<img src="../images/svg/chat.svg" alt="Pictogramme chat">'
        chatContainer.style.transform = "translateX(350px)";
    } else {
        chatBtn.classList.add("open");
        chatBtn.innerHTML = '<img src="../images/svg/quit.svg" alt="Pictogramme chat">'
        chatContainer.style.transform = "translateX(0)";
    }
})