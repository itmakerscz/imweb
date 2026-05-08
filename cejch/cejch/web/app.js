const { createApp, ref, reactive, onMounted, computed, watch } = Vue;

const SECTIONS = [
    'nav',
    'hero',
    'ubytovani',
    'akce',
    'restaurace',
    'sluzby',
    'vylety',
    'cenik',
    'rezervace',
    'footer'
];

async function initApp() {
    const appContainer = document.getElementById('app');

    // Načtení všech fragmentů paralelně pro rychlejší start
    const fragmentPromises = SECTIONS.map(section => 
        fetch(`${section}-section.html`).then(res => res.ok ? res.text() : null)
    );

    const fragments = await Promise.all(fragmentPromises);
    fragments.forEach(html => {
        if (html) appContainer.insertAdjacentHTML('beforeend', html);
    });

    // Inicializace Vue až po načtení všech fragmentů
    createApp({
    setup() {
        const isMenuOpen = ref(false);
        const showAllTrips = ref(false);
        const showAllGallery = ref(false);
        const showAllMenu = ref(false);
        const selectedDifficulty = ref('všechny');
        const activeGalleryIndex = ref(0);
        const selectedPersons = ref('all');
        const selectedDateFrom = ref('');
        const selectedDateTo = ref('');
        
        const isNavHidden = ref(false);
        const activeSection = ref('hero');
        const calendarTransition = ref('slide-next');
        const currency = ref('CZK');
        const exchangeRate = ref(25.3); // Výchozí kurz pro případ výpadku API

        const calendarMonth = ref(new Date().getMonth());
        const calendarYear = ref(new Date().getFullYear());
        const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
        const randomPhotos = ref([]);
        const todayStr = new Date().toISOString().split('T')[0];
        const parsePrice = (p) => parseInt(p.replace(/[^\d]/g, '')) || 0;

        // Univerzální formátovač ceny podle vybrané měny
        const displayPrice = (val) => {
            if (val === undefined || val === null) return '';
            const num = typeof val === 'number' ? val : parsePrice(String(val));
            
            if (currency.value === 'EUR') {
                return (num / exchangeRate.value).toLocaleString('de-DE', { 
                    style: 'currency', 
                    currency: 'EUR' 
                });
            }
            
            return new Intl.NumberFormat('cs-CZ', {
                style: 'currency',
                currency: 'CZK',
                maximumFractionDigits: 0
            }).format(num);
        };

        const data = reactive({
            ubytovani: [], menu: [], sluzby: [], vylety: [], ceny: [],
            planovane_akce: [], restaurace_info: {}, restaurace_galerie: []
        });
        const calendar = ref({});
        const form = ref({ name: '', email: '', type: 'rodina', msg: '', dateFrom: '', dateTo: '', accommodation: '', nights: 1 });

        // --- GALLERY AUTOPLAY ---
        let autoplayTimer = null;
        const startAutoplay = () => {
            if (autoplayTimer || data.restaurace_galerie.length === 0) return;
            autoplayTimer = setInterval(() => {
                const total = data.restaurace_galerie.length;
                const nextIndex = (activeGalleryIndex.value + 1) % total;
                scrollToImage(nextIndex);
            }, 5000); // Interval 5 sekund
        };

        const stopAutoplay = () => {
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        };

        // --- DATA LOADING ---
        const loadData = async () => {
            try {
                const fetchJson = async (url) => {
                    const res = await fetch(url).catch(() => null);
                    return res && res.ok ? await res.json() : null;
                };

                const [jsonData, calData, akceData] = await Promise.all([
                    fetchJson('data.json'),
                    fetchJson('calendar.json'),
                    fetchJson('akce.json')
                ]);
                
                if (jsonData) {
                    Object.assign(data, jsonData);
                    if (data.vylety) {
                        data.vylety = data.vylety.map(t => ({ ...t, showQR: false }));
                    }
                }

                if (calData) calendar.value = calData;
                if (akceData) data.planovane_akce = akceData;

                if (data.restaurace_galerie?.length > 0) {
                    randomPhotos.value = [...data.restaurace_galerie].sort(() => 0.5 - Math.random()).slice(0, 3);
                    startAutoplay();
                }
            } catch (err) { console.error("Chyba při načítání dat:", err); }
        };

        const filteredTrips = computed(() => selectedDifficulty.value === 'všechny' ? data.vylety : data.vylety.filter(t => t.difficulty === selectedDifficulty.value));
        const displayTrips = computed(() => showAllTrips.value ? filteredTrips.value : [...filteredTrips.value].sort(() => 0.5 - Math.random()).slice(0, 3));

        // Efektivní index obsazenosti pro bleskové vyhledávání O(1)
        const occupiedMap = computed(() => {
            const map = new Map();
            data.ceny.forEach(unit => {
                const periods = calendar.value[unit.typ] || [];
                periods.forEach(p => {
                    let curr = new Date(p.from);
                    const end = new Date(p.to);
                    while (curr <= end) {
                        const dStr = curr.toISOString().split('T')[0];
                        map.set(dStr, (map.get(dStr) || 0) + 1);
                        curr.setDate(curr.getDate() + 1);
                    }
                });
            });
            return map;
        });

        // Pomocný computed property pro přehled obsazenosti (náhrada za events-calendar.js)
        const occupancySummary = computed(() => {
            if (!calendar.value) return [];
            return Object.entries(calendar.value).map(([unit, periods]) => ({
                unit,
                periods,
                isFree: periods.length === 0
            }));
        });
        
        const filteredPrices = computed(() => {
            let prices = selectedPersons.value === 'all' ? data.ceny : data.ceny.filter(c => c.max_persons >= selectedPersons.value);
            // Pokud je vybrán rozsah v kalendáři, zobrazíme pouze dostupné chatky
            if (selectedDateFrom.value && selectedDateTo.value) {
                prices = prices.filter(c => isAvailable(c.typ));
            }
            return prices;
        });

        const nightsCount = computed(() => {
            if (!selectedDateFrom.value || !selectedDateTo.value) return 0;
            const diff = Math.ceil((new Date(selectedDateTo.value) - new Date(selectedDateFrom.value)) / 86400000);
            return diff > 0 ? diff : 0;
        });

        // Pomocná funkce pro výpočet celkové ceny včetně víkendových příplatků
        const calculateTotalPrice = (row, dateFrom, dateTo, personCount) => {
            if (!row || !dateFrom || !dateTo) return 0;
            
            // Použijeme lokální datum pro správné určení dne v týdnu bez posunu časových pásem
            const [y1, m1, d1] = dateFrom.split('-').map(Number);
            const [y2, m2, d2] = dateTo.split('-').map(Number);
            const start = new Date(y1, m1 - 1, d1);
            const end = new Date(y2, m2 - 1, d2);
            
            const nights = Math.ceil((end - start) / 86400000);
            if (nights <= 0) return 0;

            const persons = personCount === 'all' ? "1" : String(personCount);
            const basePrice = parsePrice(row.prices[persons] || row.prices["1"]);
            const weekendSurcharge = parsePrice(calendar.value.weekend_surcharge || "0 Kč");

            let total = 0;
            let current = new Date(start);
            for (let i = 0; i < nights; i++) {
                let nightPrice = basePrice;
                const dayOfWeek = current.getDay(); // 5 = Pátek, 6 = Sobota
                if (dayOfWeek === 5 || dayOfWeek === 6) {
                    nightPrice += weekendSurcharge;
                }
                total += nightPrice;
                current.setDate(current.getDate() + 1);
            }
            return total;
        };

        const getStayPrice = (row) => {
            const total = calculateTotalPrice(row, selectedDateFrom.value, selectedDateTo.value, selectedPersons.value);
            return total > 0 ? displayPrice(total) : null;
        };

        const getRoomImage = (typ) => {
            const room = data.ubytovani.find(u => typ.toLowerCase().includes(u.title.toLowerCase().split(' ')[0]));
            return room ? room.img : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80';
        };

        const isAvailable = (typ) => {
            if (!selectedDateFrom.value || !selectedDateTo.value || !calendar.value[typ]) return true;
            const s1 = selectedDateFrom.value;
            const e1 = selectedDateTo.value;
            return !calendar.value[typ].some(p => p.from <= e1 && p.to >= s1);
        };

        // Pomocná funkce pro generování dnů konkrétního měsíce
        const generateMonthDays = (month, year) => {
            const firstDay = new Date(year, month, 1).getDay();
            const offset = firstDay === 0 ? 6 : firstDay - 1;
            const days = [];

            const prevLastDay = new Date(year, month, 0).getDate();
            for (let i = offset - 1; i >= 0; i--) {
                const d = prevLastDay - i;
                const m = month === 0 ? 11 : month - 1;
                const y = month === 0 ? year - 1 : year;
                days.push({ date: d, fullDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, currentMonth: false });
            }

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                days.push({ date: d, fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, currentMonth: true });
            }

            const remaining = 42 - days.length;
            for (let d = 1; d <= remaining; d++) {
                const m = month === 11 ? 0 : month + 1;
                const y = month === 11 ? year + 1 : year;
                days.push({ date: d, fullDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, currentMonth: false });
            }
            return days;
        };

        // Pohled na více měsíců najednou
        const multiMonthView = computed(() => {
            const view = [];
            for (let i = 0; i < 3; i++) {
                let m = calendarMonth.value + i;
                let y = calendarYear.value;
                if (m > 11) { m -= 12; y++; }
                
                view.push({
                    month: m,
                    year: y,
                    name: monthNames[m],
                    days: generateMonthDays(m, y)
                });
            }
            return view;
        });

        const calendarDays = computed(() => generateMonthDays(calendarMonth.value, calendarYear.value));

        // Den je obsazen pouze pokud jsou VŠECHNY typy ubytování v areálu plné
        const isDateOccupied = (dateStr) => {
            const count = occupiedMap.value.get(dateStr) || 0;
            return data.ceny.length > 0 && count >= data.ceny.length;
        };

        const isDatePartiallyOccupied = (dateStr) => {
            const count = occupiedMap.value.get(dateStr) || 0;
            return count > 0 && count < data.ceny.length;
        };

        const isPublicHoliday = computed(() => (dateStr) => {
            const holidays = ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"];
            const specific2026 = ["2026-04-03", "2026-04-06"]; // Velký pátek a Velikonoční pondělí 2026
            return dateStr && (holidays.includes(dateStr.substring(5)) || specific2026.includes(dateStr));
        });

        const isPastDay = (dateStr) => {
            return dateStr && dateStr < todayStr;
        };

        const isToday = (dateStr) => dateStr === todayStr;

        const isDateSelected = computed(() => (dateStr) => dateStr && (dateStr === selectedDateFrom.value || dateStr === selectedDateTo.value));
        
        const isDateInRange = (dateStr) => {
            if (!selectedDateFrom.value || !selectedDateTo.value || !dateStr) return false;
            return dateStr > selectedDateFrom.value && dateStr < selectedDateTo.value;
        };

        const changeMonth = (delta) => {
            calendarTransition.value = delta > 0 ? 'slide-next' : 'slide-prev';
            calendarMonth.value += delta;
            if (calendarMonth.value < 0) { calendarMonth.value = 11; calendarYear.value--; }
            else if (calendarMonth.value > 11) { calendarMonth.value = 0; calendarYear.value++; }
        };

        const totalPrice = computed(() => {
            const acc = data.ceny.find(c => c.typ === form.value.accommodation);
            const total = calculateTotalPrice(acc, form.value.dateFrom, form.value.dateTo, selectedPersons.value);
            return total > 0 ? displayPrice(total) : displayPrice(0);
        });

        const selectAccommodation = (typ) => {
            // Okamžitá kontrola dostupnosti, pokud jsou již vybrána data v kalendáři
            if (selectedDateFrom.value && selectedDateTo.value && !isAvailable(typ)) {
                alert(`Omlouváme se, ale ${typ} je v termínu od ${selectedDateFrom.value} do ${selectedDateTo.value} již obsazen.`);
                return;
            }

            form.value.accommodation = typ;
            if (selectedDateFrom.value) form.value.dateFrom = selectedDateFrom.value;
            if (selectedDateTo.value) {
                form.value.dateTo = selectedDateTo.value;
                form.value.nights = Math.ceil((new Date(selectedDateTo.value) - new Date(selectedDateFrom.value)) / 86400000) || 1;
            }
            scrollTo('rezervace');
        };

        const selectCalendarDay = (date) => {
            if (!date || isPastDay(date) || isDateOccupied(date)) return;

            // Reset výběru: pokud nic není vybráno, už máme celý rozsah, nebo klikneme znovu na stejný den
            if (!selectedDateFrom.value || selectedDateTo.value || date === selectedDateFrom.value) {
                selectedDateFrom.value = date;
                selectedDateTo.value = '';
                return;
            }

            // Seřadíme data pro případ, že uživatel vybral dřívější datum jako druhé v pořadí
            const [start, end] = [selectedDateFrom.value, date].sort();

            // Validace: Nesmí existovat plně obsazený den v celém vybraném rozsahu
            let check = new Date(start);
            while (check <= new Date(end)) {
                if (isDateOccupied(check.toISOString().split('T')[0])) {
                    selectedDateFrom.value = date; // Reset na nový počáteční bod
                    selectedDateTo.value = '';
                    return;
                }
                check.setDate(check.getDate() + 1);
            }

            selectedDateFrom.value = start;
            selectedDateTo.value = end;
        };

        const handleGalleryScroll = (e) => {
            const el = e.target;
            const itemWidth = (el.offsetWidth * 0.85) || 300;
            activeGalleryIndex.value = Math.round(el.scrollLeft / itemWidth);
        };

        const scrollGallery = (direction) => {
            const el = appContainer.querySelector('.gallery-grid');
            if (!el) return;
            const scrollAmount = el.offsetWidth * 0.85;
            el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        };

        const scrollToImage = (index) => {
            const el = appContainer.querySelector('.gallery-grid');
            if (!el) return;
            const itemWidth = el.offsetWidth * 0.85;
            el.scrollTo({ left: index * itemWidth, behavior: 'smooth' });
        };

        // Propojení kalendáře s formulářem
        watch([() => form.value.dateFrom, () => form.value.dateTo], ([f, t]) => {
            selectedDateFrom.value = f;
            selectedDateTo.value = t;
            if (f && t) {
                const diff = Math.ceil((new Date(t) - new Date(f)) / 86400000);
                form.value.nights = diff > 0 ? diff : 1;
                if (diff <= 0) { form.value.dateTo = ''; selectedDateTo.value = ''; }
            }
        });

        onMounted(() => {
            loadData();
            // Načtení aktuálního kurzu z veřejného API (Open Exchange Rates)
            fetch('https://open.er-api.com/v6/latest/CZK')
                .then(res => res.json())
                .then(json => {
                    if (json?.rates?.EUR) exchangeRate.value = 1 / json.rates.EUR;
                })
                .catch(() => console.warn("Nepodařilo se aktualizovat kurz CZK/EUR."));

            // Observer pro detekci aktivní sekce při skrolování
            const observerOptions = { rootMargin: '-70px 0px -20% 0px', threshold: 0.1 };
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        activeSection.value = entry.target.id;
                    }
                });
            }, observerOptions);

            ['hero', 'ubytovani', 'akce', 'restaurace', 'vylety', 'rezervace', 'cenik'].forEach(id => {
                const el = document.getElementById(id);
                if (el) observer.observe(el);
            });
        });

        const scrollTo = (id) => { isMenuOpen.value = false; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
        const submitForm = () => {
            // Automatické ověření před odesláním
            if (!form.value.accommodation) {
                alert("Prosím vyberte typ ubytování v ceníku.");
                return;
            }

            const accommodation = form.value.accommodation;
            const isStillFree = !calendar.value[accommodation]?.some(p => 
                p.from <= form.value.dateTo && p.to >= form.value.dateFrom
            );

            if (!isStillFree) {
                alert(`Omlouváme se, ale ${accommodation} byl právě v tomto termínu obsazen. Vyberte si prosím jiný termín nebo chatku.`);
                return;
            }

            alert(`Děkujeme, poptávka odeslána.`);
            form.value = { name: '', email: '', type: 'rodina', msg: '', dateFrom: '', dateTo: '', accommodation: '', nights: 1 };
        };

        return { isMenuOpen, showAllTrips, showAllGallery, showAllMenu, selectedDifficulty, selectedPersons, selectedDateFrom, selectedDateTo, isAvailable, selectAccommodation, selectCalendarDay, isDateSelected, isDateInRange, isPastDay, isPublicHoliday, isDatePartiallyOccupied, totalPrice, nightsCount, getStayPrice, getRoomImage, filteredTrips, displayTrips, filteredPrices, randomPhotos, data, form, scrollTo, submitForm, calendar, calendarMonth, calendarYear, monthNames, calendarDays, isDateOccupied, isToday, changeMonth, occupancySummary, activeGalleryIndex, handleGalleryScroll, scrollGallery, scrollToImage, startAutoplay, stopAutoplay, currency, displayPrice, activeSection, isNavHidden, multiMonthView, calendarTransition };
    }
    }).mount('#app');
}

initApp();