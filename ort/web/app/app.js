const { createApp, ref, computed, onMounted, onUnmounted, watch } = Vue;

// Initialize IntersectionObserver for card reveals
const cardObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });

const vReveal = {
  mounted(el) {
    cardObserver.observe(el);
  }
};

// Shared helpers
const getLogoSrc = (isDarkMode, isIcon = false) => {
  if (isIcon) return isDarkMode ? 'assets/logo_white_icon.png' : 'assets/logo_icon.png';
  return isDarkMode ? 'assets/logo_white.png' : 'assets/logo.png';
};

const AppNavbar = {
  props: ['isDarkMode', 'isScrolled', 'isMenuOpen', 'navItems', 'activeSection', 'scrollProgress'],
  emits: ['toggle-theme', 'toggle-menu', 'close-menu'],
  computed: {
    logoSrc() { return getLogoSrc(this.isDarkMode); },
    logoIconSrc() { return getLogoSrc(this.isDarkMode, true); }
  },
  methods: {
    isActive(link) {
      if (link.includes('#')) {
        const hash = link.split('#')[1];
        return this.activeSection === hash;
      }
      const path = window.location.pathname;
      if (link === 'index.html') return path === '/' || path === '' || path.endsWith('index.html');
      return path.endsWith(link);
    }
  },
  template: `
    <div class="scroll-progress-container">
      <div class="scroll-progress-bar" :style="{ width: scrollProgress + '%' }"></div>
    </div>
    <div class="nav-wrapper" :class="{ 'scrolled': isScrolled }">
      <nav>
        <a href="index.html" aria-label="Domů">
          <img :src="logoSrc" alt="ORT Logo" class="logo-img logo-full">
          <img :src="logoIconSrc" alt="ORT Logo" class="logo-img logo-icon">
        </a>
        <button class="menu-toggle" @click="$emit('toggle-menu')" :class="{ 'active': isMenuOpen }" :aria-label="isMenuOpen ? 'Zavřít menu' : 'Otevřít menu'">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" :class="{ 'active': isMenuOpen }">
          <li v-for="item in navItems" :key="item.id">
            <a :href="item.link" @click="$emit('close-menu')" :class="{ 'active': isActive(item.link) }" :aria-label="item.ariaLabel">{{ item.text }}</a>
          </li>
          <li><a href="mailto:obchod@ortnb.cz" class="cta-btn" aria-label="Odeslat e-mail na obchodní oddělení">KONTAKT</a></li>
          <li class="mobile-theme-item">
            <button @click="$emit('toggle-theme')" class="theme-btn" :class="{ 'dark': isDarkMode }" :aria-label="isDarkMode ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'">
              <span class="material-symbols-outlined">light_mode</span>
              <span class="material-symbols-outlined">dark_mode</span>
            </button>
          </li>
        </ul>
        <div class="nav-controls">
          <button @click="$emit('toggle-theme')" class="theme-btn" :class="{ 'dark': isDarkMode }" :aria-label="isDarkMode ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'">
            <span class="material-symbols-outlined">light_mode</span>
            <span class="material-symbols-outlined">dark_mode</span>
          </button>
        </div>
      </nav>
    </div>
  `
};

const AppHeroCoordinates = {
  props: ['data'],
  template: `
    <div class="hero-coordinate coord-tl flicker-text">REF: 50.2396 N</div>
    <div class="hero-coordinate coord-tr flicker-text">LOC: 15.4814 E</div>
    <div class="hero-coordinate coord-bl flicker-text" v-if="data?.id">ID: {{ data.id }}</div>
    <div class="hero-coordinate coord-br flicker-text" v-if="data?.grid">GRID: {{ data.grid }}</div>
  `
};

const AppBentoCard = {
  props: ['card', 'highlight'],
  template: `
    <section :id="card.id" v-reveal
        :class="['card', card.span, card.customClass]">
      <div v-if="card.icon" class="icon-box">
          <span class="material-symbols-outlined">{{ card.icon }}</span>
      </div>
      <div class="card-body">
          <h3 v-html="highlight(card.title)"></h3>
          <p v-html="highlight(card.desc)"></p>
      </div>
      <div v-if="card.button" class="card-action">
          <a :href="card.button.link" class="action-btn">
              {{ card.button.text }}
          </a>
      </div>
    </section>
  `
};

const AppBentoGrid = {
  props: ['cards'],
  setup(props) {
    const searchQuery = ref('');
    const debouncedSearchQuery = ref('');
    let timeout = null;

    // Debounce logic: update debouncedSearchQuery after 300ms of inactivity
    watch(searchQuery, (newVal) => {
      clearTimeout(timeout);
      if (!newVal) {
        debouncedSearchQuery.value = '';
        return;
      }
      timeout = setTimeout(() => {
        debouncedSearchQuery.value = newVal;
      }, 300);
    });
    
    const filteredCards = computed(() => {
      const q = debouncedSearchQuery.value.trim().toLowerCase();
      if (!q) return props.cards || [];
      
      return (props.cards || []).filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.desc.toLowerCase().includes(q)
      );
    });

    const highlight = (text) => {
      const q = debouncedSearchQuery.value.trim();
      if (!q) return text;
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeQ})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    return { searchQuery, debouncedSearchQuery, filteredCards, highlight };
  },
  template: `
    <div class="filter-wrapper">
      <div class="search-box">
        <span class="material-symbols-outlined">search</span>
        <input type="text" v-model="searchQuery" placeholder="Hledat v sekci..." aria-label="Hledat v obsahu sekce">
        <span v-if="searchQuery" class="material-symbols-outlined clear-btn" @click="searchQuery = ''" role="button" aria-label="Vymazat vyhledávání">close</span>
      </div>
    </div>

    <main class="bento">
      <transition-group name="bento-fade" tag="div" style="display: contents">
        <div v-if="filteredCards.length === 0" key="empty-state" class="bento-empty">
          <span class="material-symbols-outlined">search_off</span>
          <h3>Žádné výsledky</h3>
          <p>Pro výraz "{{ debouncedSearchQuery }}" nebylo nic nalezeno.</p>
          <button class="action-btn" @click="searchQuery = ''" style="margin-top: 20px;">Vymazat hledání</button>
        </div>

        <app-bento-card 
          v-for="card in filteredCards" 
          :key="card.id" 
          :card="card" 
          :highlight="highlight" />
      </transition-group>
      <slot></slot>
    </main>
  `
};

const AppContactForm = {
  props: {
    title: { type: String, default: 'Máte projekt nebo dotaz?' },
    description: { type: String, default: 'Napište nám a náš tým se vám ozve zpět s profesionálním návrhem řešení.' }
  },
  setup() {
    const formData = ref({ name: '', email: '', message: '' });
    const touched = ref({ name: false, email: false, message: false });
    const isSubmitted = ref(false);

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const errors = computed(() => ({
      name: touched.value.name && formData.value.name.length < 2,
      email: touched.value.email && !isValidEmail(formData.value.email),
      message: touched.value.message && formData.value.message.length < 10
    }));

    const handleSubmit = () => {
      touched.value = { name: true, email: true, message: true };
      if (errors.value.name || errors.value.email || errors.value.message) return;

      isSubmitted.value = true;
      setTimeout(() => {
        isSubmitted.value = false;
        formData.value = { name: '', email: '', message: '' };
        touched.value = { name: false, email: false, message: false };
      }, 5000);
    };
    return { formData, touched, errors, isSubmitted, handleSubmit };
  },
  template: `
    <section class="contact-container">
      <div v-reveal class="card contact-card" :class="{ 'success-state': isSubmitted }">
        <div v-if="!isSubmitted" class="contact-grid">
          <div class="contact-info">
            <div class="icon-box"><span class="material-symbols-outlined">mail</span></div>
            <h3>{{ title }}</h3>
            <p>{{ description }}</p>
          </div>
          <form @submit.prevent="handleSubmit" class="contact-form">
            <div class="form-group">
              <input type="text" v-model="formData.name" @blur="touched.name = true" :class="{ 'error': errors.name }" placeholder="Jméno" required>
              <span v-if="errors.name" class="error-msg">Jméno musí mít alespoň 2 znaky.</span>
            </div>
            <div class="form-group">
              <input type="email" v-model="formData.email" @blur="touched.email = true" :class="{ 'error': errors.email }" placeholder="E-mail" required>
              <span v-if="errors.email" class="error-msg">Zadejte platnou e-mailovou adresu.</span>
            </div>
            <div class="form-group full-width">
              <textarea v-model="formData.message" @blur="touched.message = true" :class="{ 'error': errors.message }" placeholder="Vaše zpráva..." rows="4" required></textarea>
              <span v-if="errors.message" class="error-msg">Zpráva musí mít alespoň 10 znaků.</span>
            </div>
            <button type="submit" class="action-btn">ODESLAT ZPRÁVU</button>
          </form>
        </div>
        <div v-else class="contact-success">
          <span class="material-symbols-outlined success-icon">check_circle</span>
          <h3>Děkujeme!</h3>
          <p>Vaše zpráva byla úspěšně odeslána. Brzy se vám ozveme.</p>
        </div>
      </div>
    </section>
  `
};

const AppFooter = {
  props: ['isDarkMode'],
  computed: {
    logoSrc() { return getLogoSrc(this.isDarkMode); },
    logoIconSrc() { return getLogoSrc(this.isDarkMode, true); }
  },
  template: `
    <footer>
      <img :src="logoSrc" alt="ORT Logo" class="footer-logo-img logo-full" loading="lazy">
      <img :src="logoIconSrc" alt="ORT Logo" class="footer-logo-img logo-icon" loading="lazy">
      <p>© {{ new Date().getFullYear() }} ORT Nový Bydžov | Červeněves 98, Smidary</p>
    </footer>
  `
};

const app = createApp({
  setup() {
    const isDarkMode = ref(
      localStorage.getItem('theme') 
        ? localStorage.getItem('theme') === 'dark' 
        : window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    // Reactive sync of theme to the HTML element
    watch(isDarkMode, (val) => {
      document.documentElement.dataset.theme = val ? 'dark' : 'light';
    }, { immediate: true });

    const toggleTheme = () => {
      isDarkMode.value = !isDarkMode.value;
      localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light');
    };

    const isScrolled = ref(false);
    const isMenuOpen = ref(false);
    const activeSection = ref('');
    const scrollProgress = ref(0);

    let sectionObserver = null;
    let videoObserver = null;

    const isHomePage = computed(() => {
      const path = window.location.pathname;
      return path.endsWith('index.html') || path.endsWith('/') || path === '';
    });

    const navItems = computed(() => {
      const prefix = isHomePage.value ? '' : 'index.html';
      return navItemsRaw.map(item => ({
        ...item,
        link: item.anchor ? `${prefix}#${item.anchor}` : item.link
      }));
    });

    const currentPageData = computed(() => {
      const path = window.location.pathname.split('/').pop() || 'index.html';
      const pageMap = {
        'o-nas.html': allSectionsData.about,
        'kariera.html': allSectionsData.career,
        'pronajem.html': allSectionsData.rent,
        'index.html': allSectionsData.home
      };
      return pageMap[path] || allSectionsData.home;
    });

    const cards = computed(() => currentPageData.value.cards);

    const hero = computed(() => currentPageData.value.hero);

    const coords = computed(() => currentPageData.value.coords);

    // Automatically sync page title from data.js
    watch(currentPageData, (data) => {
      if (data && data.meta && data.meta.title) {
        document.title = data.meta.title;
      }
    }, { immediate: true });

    const toggleMenu = () => {
      isMenuOpen.value = !isMenuOpen.value;
      document.body.style.overflow = isMenuOpen.value ? 'hidden' : 'auto';
    };
    const closeMenu = () => {
      isMenuOpen.value = false;
      document.body.style.overflow = 'auto';
    };

    const handleScroll = () => {
      // Threshold can be adjusted; 50px provides immediate feedback
      // to the user that the navigation is reactive.
      isScrolled.value = window.scrollY > 50;

      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      scrollProgress.value = height > 0 ? (winScroll / height) * 100 : 0;
    };

    let parallaxTicking = false;
    const handleHeroParallax = (e) => {
      if (!parallaxTicking) {
        window.requestAnimationFrame(() => {
          const x = (window.innerWidth / 2 - e.clientX) / 80;
          const y = (window.innerHeight / 2 - e.clientY) / 80;
          document.documentElement.style.setProperty('--grid-x', `${x}px`);
          document.documentElement.style.setProperty('--grid-y', `${y}px`);
          // Robot moves in opposite direction to create depth
          document.documentElement.style.setProperty('--robot-x', `${-x * 1.2}px`);
          document.documentElement.style.setProperty('--robot-y', `${-y * 1.2}px`);
          parallaxTicking = false;
        });
        parallaxTicking = true;
      }
    };

    const handleInitialHash = () => {
      if (window.location.hash) {
        const hash = window.location.hash;
        const target = document.querySelector(hash);
        if (target) {
          window.scrollTo({ top: 0 });
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };

    const setupObservers = () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e) => {
        if (!localStorage.getItem('theme')) isDarkMode.value = e.matches;
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      onUnmounted(() => mediaQuery.removeEventListener('change', handleSystemChange));

      // Navigation Spy Observer
      sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) activeSection.value = entry.target.id;
        });
      }, { 
        threshold: 0.5,
        rootMargin: "-10% 0px -70% 0px"
      });
      document.querySelectorAll('section[id]').forEach(el => sectionObserver.observe(el));

      // Video Play/Pause Observer
      videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.play().catch(() => {}); 
          } else {
            entry.target.pause();
          }
        });
      }, { threshold: 0 });
      document.querySelectorAll('.video-bg').forEach(el => videoObserver.observe(el));
    };

    onMounted(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('mousemove', handleHeroParallax, { passive: true });
      handleScroll();
      setupObservers();
      handleInitialHash();
    });

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleHeroParallax);
      if (sectionObserver) sectionObserver.disconnect();
      if (videoObserver) videoObserver.disconnect();
    });

    return { 
      isDarkMode, isScrolled, isMenuOpen, 
      navItems, cards, 
      toggleTheme, toggleMenu, closeMenu, 
      activeSection,
      scrollProgress,
      coords,
      hero
    };
  }
});

app.component('AppNavbar', AppNavbar);
app.component('AppHeroCoordinates', AppHeroCoordinates);
app.component('AppBentoCard', AppBentoCard);
app.component('AppBentoGrid', AppBentoGrid);
app.directive('reveal', vReveal);
app.component('AppContactForm', AppContactForm);
    app.component('AppFooter', AppFooter);
app.mount('#app');