document.addEventListener("DOMContentLoaded", ready);

function ready() {
    document.addEventListener('click', documentActions);
    async function documentActions(e) {
        const target = e.target;
        if (target.classList.contains('item-member__expand')) {
            showHideDescriptionHandler(target);
        }
        if (target.classList.contains('members__show-more')) {
            await loadOtherMembers(target);
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

async function loadOtherMembers(button) {
    const file = 'data/members.json';
    button.classList.add('_hold');
    const data = await loadData(file);
    let cards = [];
    if(data && data.members) {
        cards = data.members.map(renderMembersCard)
    }
    addMembersToDocument(cards);
}

function addMembersToDocument(membersCard) {
    const membersList = document.querySelector('.members__list');
    console.log(membersList)
    membersCard.forEach(card => {
        membersList.insertAdjacentHTML('beforeend', card);
    })
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

function renderMembersCard(member) {
    const template =
      `
      <div class="members__item item-member">
        <div class="item-member__body">
          <div class="item-member__header">
            <div class="item-member__name">${member.name}</div>
            <div class="item-member__position"></div>
          </div>
          <div class="item-member__photo _ibg">
            <img src="${member.photo}" alt="${member.altText}">
          </div>
          <div class="item-member__description description-member">
            <div class="description-member__part">${member.description}</div>
            <div class="description-member__part description-member__part_hide">${member.additionalDescription}</div>
          </div>
          <div class="item-member__footer">
            <button  class="item-member__expand _icon-expand-arrow"></button>
          </div>
        </div>
      </div>
      `;

    return template;
}
