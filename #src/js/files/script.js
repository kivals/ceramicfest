document.addEventListener("DOMContentLoaded", ready);

function ready() {
    const routeLinks = document.querySelectorAll('.menu__link');
    Array.from(routeLinks).forEach(link => {
        const linkUrl = new URL(link.href);
        if (linkUrl.pathname === document.location.pathname && linkUrl.hash === document.location.hash) {
            link.classList.add('_active');
        }
    })
    document.addEventListener('click', documentActions);
    async function documentActions(e) {
        const target = e.target;
        if (target.classList.contains('menu__link') && !target.classList.contains('_active')) {
            _removeClasses(document.querySelectorAll('.menu__link'), "_active");
            target.classList.add('_active');
        }

        const historyListBlock = document.querySelector('.history');
        console.log(!target.closest(".menu__link--history"))
        console.log(document.querySelector(".menu__link--history").classList.contains("_active"))
        if (target.closest(".menu__link--history")) {
            e.preventDefault()
            historyListBlock.classList.toggle('_active');
        } else if (!target.closest(".menu__link--history") && historyListBlock.classList.contains("_active")) {
            historyListBlock.classList.remove('_active');
        }

        if (target.classList.contains('item-member__expand')) {
            showHideDescriptionHandler(target);
        }
        // Обработка нажатия кнопки Показать остальных
        if (target.classList.contains('members__show-more') && !target.classList.contains('loaded')) {
            await showOtherMembers(target);
        } else if (target.classList.contains('members__show-more') && target.classList.contains('loaded')) {
            const additionalList = document.querySelector('.members__list .members__part_additional');
            additionalList.classList.toggle('show');
            target.innerHTML = additionalList.classList.contains('show') ? 'Скрыть' : 'Показать остальных';
            document.getElementById('members').scrollIntoView();
        }
        const modalWindow = document.querySelector('.program-modal');
        if (target.classList.contains('billboard__overlay') || target.classList.contains('billboard__button')) {
            const imageContainer = target.closest('.billboard__image-item');
            const targetImage = imageContainer?.querySelector('img');
            targetImage.classList.add('program-modal__content');
            const copyOfTargetImage = targetImage.cloneNode();
            modalWindow.classList.remove('_hide');
            modalWindow.append(copyOfTargetImage);
        }

        if (target.classList.contains('program-modal__close')) {
            modalWindow.classList.add('_hide');
            modalWindow.querySelector('img').remove();
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

async function showOtherMembers(button) {
    //подготовка интерфейса перед загрузкой
    button.classList.add('_hold', 'loaded');
    const additionalList = document.querySelector('.members__list .members__part_additional');
    additionalList.classList.add('show');
    //Загрузка контента
    const cards = await getMembersCards();
    if (cards) {
        addMembersToDocument(cards);
    }
    //Подготовка интерфейса после загрузки
    button.innerHTML = 'Скрыть';
    button.classList.remove('_hold');
    button.classList.add('loaded');
}

/**
 * Получить элементы интерфейса с контентом
 * @return {Promise<[]>}
 */
async function getMembersCards() {
    const file = 'data/members.json';
    const data = await loadData(file);
    let cards = [];
    if(data && data.members) {
        cards = data.members.map(renderMembersCard)
    }
    return cards;
}

/**
 * Добавить nodes в интерфейс
 * @param membersCard список cards в виде html-разметки
 */
function addMembersToDocument(membersCard) {
    const membersList = document.querySelector('.members__list .members__part_additional');
    membersCard.forEach(card => {
        membersList.insertAdjacentHTML('beforeend', card);
    });
}

/**
 * Загрузка данный из файла
 * @param file файл с данными
 * @return {Promise<any>}
 */
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

/**
 * Формирование html-разметки
 * @param member элемент данных
 * @return {string} готовая разметка
 */
function renderMembersCard(member) {
    return `
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
}
