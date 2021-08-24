document.addEventListener("DOMContentLoaded", ready);

function ready() {
    document.addEventListener('click', documentActions);
    function documentActions(e) {
        const target = e.target;
        if (target.classList.contains('item-member__expand')) {
            showHideDescriptionHandler(target)
        }
    }
}

function showHideDescriptionHandler(target) {
    const card = target.closest('.item-member');
    const expendButton = card.querySelector('.item-member__expand');
    const hideDescriptionNode = card.querySelector('.description-member__part_hide');
    expendButton.classList.toggle('show-hide');
    hideDescriptionNode.classList.toggle('show-hide');
}

async function loadData(file) {
    let response = await fetch(file, {
        method: 'GET'
    });
    if (response.ok) {
        return response.json();
    } else {
        alert("Ошибка");
    }
}
