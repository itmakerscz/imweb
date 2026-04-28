const navItemsRaw = [
  { id: 1, text: 'O nás', link: 'o-nas.html', ariaLabel: 'Více informací o naší společnosti a historii' },
  { id: 2, text: 'Výroba', anchor: 'vyroba', ariaLabel: 'Přejít na sekci naší precizní výroby' },
  { id: 3, text: 'Technologie', anchor: 'tech', ariaLabel: 'Informace o našem vývoji a technologiích Smart Factory' },
  { id: 4, text: 'Kariéra', link: 'kariera.html', ariaLabel: 'Nabídka volných pracovních pozic' },
  { id: 5, text: 'Pronájem', link: 'pronajem.html', ariaLabel: 'Možnosti pronájmu našich výrobních kapacit' }
];

const allSectionsData = {
  home: {
    meta: { title: 'ORT Nový Bydžov | Inženýrská dokonalost' },
    coords: { id: 'ORT_ENG_SYS', grid: 'X_01 // Y_04' },
    hero: {
      tag: 'Engineering excellence since 1994',
      title: 'INOVACE PRO',
      rotating: ['AUTOMOTIVE', 'PRŮMYSL 4.0', 'VAŠI VÝROBU', 'BUDOUCNOST'],
      desc: 'Komplexní inženýrská řešení od návrhu až po realizaci unikátních strojů a linek.',
      cta: { text: 'PROZKOUMAT SLUŽBY', link: '#vyvoj' }
    },
    cards: [
      { id: 'onas', category: 'Společnost', span: 'span-4', customClass: 'dark-card', title: 'Odkaz & Tradice', desc: 'Od roku 1994 budujeme v Novém Bydžově centrum inženýrské excelence. Naše stroje pomáhají lídrům v automotive po celém světě.', icon: 'history' },
      { id: 'vyroba', category: 'Výroba', span: 'span-8', title: 'Precizní výroba', desc: 'Špičkově vybavená obrobna a laserové centrum pro precizní zpracování kovů pod jednou střechou.', icon: 'precision_manufacturing' },
      { id: 'vyvoj', category: 'Engineering', span: 'span-6', title: 'Vývoj a konstrukce', desc: 'Vlastní konstrukční tým pracující v 3D systémech. Navrhujeme unikátní stroje od čistého listu papíru.', icon: 'architecture' },
      { id: 'tech', category: 'Engineering', span: 'span-6', title: 'Smart Factory', desc: 'Implementujeme prvky Industry 4.0, plnou robotizaci a inteligentní systémy řízení výroby.', icon: 'memory' },
      { id: 'automatizace', category: 'Engineering', span: 'span-6', title: 'Automatizace', desc: 'Programování PLC, návrh rozvaděčů a integrace robotických ramen do výrobních linek.', icon: 'settings_input_component' },
      { id: 'montaze', category: 'Výroba', span: 'span-6', title: 'Montáže a servis', desc: 'Oživení technologií přímo u zákazníka a následná péče o bezproblémový chod vašich zařízení.', icon: 'build' },
      { id: 'kariera', category: 'Společnost', span: 'span-12', customClass: 'dark-card', title: 'Kariéra v ORT', desc: 'Hledáme konstruktéry a programátory, kteří chtějí stavět stroje budoucnosti. Přidejte se k nám.', icon: 'group_add', button: { text: 'VOLNÁ MÍSTA', link: 'kariera.html' } },
    ]
  },
  about: {
    meta: { title: 'O nás | ORT Nový Bydžov' },
    coords: { id: 'ORT_HISTORY', grid: 'X_02 // Y_01' },
    hero: {
      tag: 'Tradice od roku 1994',
      title: 'STAVÍME STROJE,<br>KTERÉ TVOŘÍ BUDOUCNOST',
      desc: 'Prohlédněte si naše zázemí a proces výroby, kde se rodí špičková automatizační řešení.'
    },
    cards: [
      { id: 'vision', span: 'span-12', title: 'Naše vize', desc: 'V ORT Nový Bydžov věříme, že česká inženýrská škola má stále co nabídnout světové špičce. Kombinujeme tradiční řemeslo s nejmodernějšími technologiemi Industry 4.0.', icon: 'factory' },
      { id: 'history_years', span: 'span-6', title: '30+ let zkušeností', desc: 'Začínali jsme jako malá konstrukční kancelář. Dnes jsme komplexním dodavatelem s vlastní výrobní halou a týmem špičkových odborníků.', icon: 'history' },
      { id: 'global', span: 'span-6', title: 'Globální dosah', desc: 'Naše linky a zařízení najdete v závodech po celé Evropě, Asii i Americe. Jsme hrdým partnerem předních světových automobilek.', icon: 'public' }
    ]
  },
  career: {
    meta: { title: 'Kariéra | ORT Nový Bydžov' },
    coords: { id: 'ORT_HR_SYS', grid: 'X_05 // Y_12' },
    hero: {
      tag: 'Pojďte s námi stavět stroje budoucnosti',
      title: 'KARIÉRA V ORT',
      desc: 'Hledáme nadšené profesionály, kteří se nebojí výzev a chtějí pracovat na unikátních projektech pro světové značky.'
    },
    cards: [
      { id: 'designer', span: 'span-6', title: 'Konstruktér / Projektant', desc: 'Navrhování 3D sestav v SolidWorks, tvorba výkresové dokumentace a úzká spolupráce s výrobou.', icon: 'architecture' },
      { id: 'plc', span: 'span-6', title: 'Programátor PLC', desc: 'Oživování strojů, programování řídicích systémů (Siemens TIA Portal) a integrace robotů ABB/Fanuc.', icon: 'settings_input_component' }
    ]
  },
  rent: {
    meta: { title: 'Pronájem kapacit | ORT Nový Bydžov' },
    coords: { id: 'ORT_RENT_CAP', grid: 'X_09 // Y_03' },
    hero: {
      tag: 'Precizní technologie pro vaše potřeby',
      title: 'PRONÁJEM KAPACIT',
      desc: 'Využijte naše špičkově vybavené dílny a zkušený personál pro vaši zakázkovou výrobu.'
    },
    cards: [
      { 
        id: 'cnc', span: 'span-6', title: 'CNC obrábění', icon: 'precision_manufacturing',
        desc: 'Frézování a soustružení na moderních 5-osých centrech s vysokou přesností.', 
        button: { text: 'POPTAT KAPACITU', link: 'mailto:obchod@ortnb.cz?subject=Poptávka CNC' }
      },
      { 
        id: 'laser', span: 'span-6', title: 'Laserové řezání', icon: 'content_cut',
        desc: 'Rychlé a přesné pálení plechů z oceli, nerezu i hliníku s minimálními tepelnými deformacemi.', 
        button: { text: 'POPTAT PÁLENÍ', link: 'mailto:obchod@ortnb.cz?subject=Poptávka Laser' }
      }
    ]
  }
};