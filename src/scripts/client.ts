export function initClient(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    // Подсветка активного пункта меню
    const routeLinks = document.querySelectorAll<HTMLAnchorElement>('.menu__link');
    routeLinks.forEach(link => {
      try {
        const linkUrl = new URL(link.href);
        if (linkUrl.pathname === document.location.pathname && linkUrl.hash === document.location.hash) {
          link.classList.add('_active');
        }
      } catch { /* skip bad URLs */ }
    });

    // Mobile burger menu toggle
    const iconMenu = document.querySelector<HTMLElement>('.icon-menu');
    const menuBody = document.querySelector<HTMLElement>('.menu__body');
    if (iconMenu && menuBody) {
      const toggleMenu = () => {
        iconMenu.classList.toggle('_active');
        menuBody.classList.toggle('_active');
        document.body.classList.toggle('_lock');
      };
      iconMenu.addEventListener('click', toggleMenu);
      menuBody.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.menu__link') || e.target === menuBody) {
          if (menuBody.classList.contains('_active')) {
            toggleMenu();
          }
        }
      });
    }

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Active menu item
      if (target.classList.contains('menu__link') && !target.classList.contains('_active')) {
        document.querySelectorAll('.menu__link').forEach(el => el.classList.remove('_active'));
        target.classList.add('_active');
      }

      // History widget toggle
      const historyListBlock = document.querySelector('.history');
      if (target.closest('.menu__link--history')) {
        e.preventDefault();
        historyListBlock?.classList.toggle('_active');
      } else if (!target.closest('.menu__link--history') && historyListBlock?.classList.contains('_active')) {
        historyListBlock.classList.remove('_active');
      }

      // Member expand/collapse
      if (target.classList.contains('item-member__expand')) {
        showHideDescription(target);
      }

      // "Показать остальных"
      if (target.classList.contains('members__show-more')) {
        const additionalList = document.querySelector('.members__list .members__part_additional');
        if (additionalList) {
          additionalList.classList.toggle('show');
          target.innerHTML = additionalList.classList.contains('show') ? 'Скрыть' : 'Показать остальных';
          if (!additionalList.classList.contains('show')) {
            document.getElementById('members')?.scrollIntoView();
          }
        }
      }

      // Программа: модалка картинки
      const modalWindow = document.querySelector('.program-modal');
      if (target.classList.contains('billboard__overlay') || target.classList.contains('billboard__button')) {
        const imageContainer = target.closest('.billboard__image-item');
        const targetImage = imageContainer?.querySelector('img');
        if (targetImage && modalWindow) {
          targetImage.classList.add('program-modal__content');
          const copy = targetImage.cloneNode() as HTMLImageElement;
          modalWindow.classList.remove('_hide');
          modalWindow.append(copy);
        }
      }
      if (target.classList.contains('program-modal__close')) {
        if (modalWindow) {
          modalWindow.classList.add('_hide');
          modalWindow.querySelector('img')?.remove();
        }
      }
    });
  });
}

function showHideDescription(target: HTMLElement): void {
  const card = target.closest('.item-member');
  if (!card) return;
  const expandButton = card.querySelector('.item-member__expand');
  const hideDescriptionNode = card.querySelector('.description-member__part_hide');
  expandButton?.classList.toggle('show-hide');
  hideDescriptionNode?.classList.toggle('show-hide');
}
