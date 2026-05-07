const { createApp, ref, onMounted, computed, watch } = Vue;

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

    // Načtení všech HTML fragmentů
    for (const section of SECTIONS) {
        try {
            const response = await fetch(`${section}-section.html`);
            if (response.ok) {
                const html = await response.text();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                // Vložíme pouze vnitřní obsah fragmentu (aby se nám nemnožily zbytečné obalové divy)
                while (tempDiv.firstChild) {
                    appContainer.appendChild(tempDiv.firstChild);
                }
            }
        } catch (err) {
            console.error(`Chyba při načítání sekce ${section}:`, err);
        }
    }

    // Inicializace Vue až po načtení všech fragmentů
    createApp({
    setup() {
        const isMenuOpen = ref(false);
        const showAllTrips = ref(false);
        const showAllGallery = ref(false);
        const showAllMenu = ref(false);
        const selectedDifficulty = ref('všechny');
        const selectedPersons = ref('all');
        const selectedDateFrom = ref('');
        const selectedDateTo = ref('');
        
        const calendarMonth = ref(new Date().getMonth());
        const calendarYear = ref(new Date().getFullYear());
        const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
        const randomPhotos = ref([]);

        const data = ref({
            ubytovani: [], menu: [], sluzby: [], vylety: [], ceny: [],
            planovane_akce: [], restaurace_info: {}, restaurace_galerie: []
        });
        const calendar = ref({}); // Moved here to ensure data.value.ceny is loaded first        
        const form = ref({ name: '', email: '', type: 'rodina', msg: '', dateFrom: '', dateTo: '', accommodation: '', nights: 1 });

        const loadData = async () => {
            try {
                const [dataRes, calRes, akceRes] = await Promise.all([fetch('data.json'), fetch('calendar.json'), fetch('akce.json')]);
                
                // Bezpečné parsování s defaultními hodnotami pro případ chyby
                const jsonData = dataRes.ok ? await dataRes.json() : {};
                if (jsonData.vylety) {
                    jsonData.vylety = jsonData.vylety.map(t => ({ ...t, showQR: false }));
                }
                data.value = jsonData;
                
                calendar.value = calRes.ok ? await calRes.json() : {};
                data.value.planovane_akce = akceRes.ok ? await akceRes.json() : [];

                randomPhotos.value = [...data.value.restaurace_galerie].sort(() => 0.5 - Math.random()).slice(0, 3);
            } catch (err) { console.error("Chyba při načítání dat:", err); }
        };

        const filteredTrips = computed(() => selectedDifficulty.value === 'všechny' ? data.value.vylety : data.value.vylety.filter(t => t.difficulty === selectedDifficulty.value));
        const displayTrips = computed(() => showAllTrips.value ? filteredTrips.value : [...filteredTrips.value].sort(() => 0.5 - Math.random()).slice(0, 3));
        
        const filteredPrices = computed(() => {
            let prices = selectedPersons.value === 'all' ? data.value.ceny : data.value.ceny.filter(c => c.max_persons >= selectedPersons.value);
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

        const getStayPrice = (row) => {
            const nights = nightsCount.value;
            if (nights <= 0) return null;
            const persons = selectedPersons.value === 'all' ? "1" : String(selectedPersons.value);
            const priceStr = row.prices[persons] || row.prices["1"];
            const price = parseInt(priceStr.replace(/[^\d]/g, ''));
            return (price * nights).toLocaleString('cs-CZ') + ' Kč';
        };

        const isAvailable = (typ) => {
            if (!selectedDateFrom.value || !selectedDateTo.value || !calendar.value[typ]) return true;
            const s1 = selectedDateFrom.value;
            const e1 = selectedDateTo.value;
            return !calendar.value[typ].some(p => p.from <= e1 && p.to >= s1);
        };

        const calendarDays = computed(() => {
            const firstDayOfMonth = new Date(calendarYear.value, calendarMonth.value, 1);
            const lastDayOfMonth = new Date(calendarYear.value, calendarMonth.value + 1, 0);
            const firstDay = firstDayOfMonth.getDay();
            const offset = firstDay === 0 ? 6 : firstDay - 1;
            
            const days = [];

            // Dny z předchozího měsíce
            const prevMonthLastDay = new Date(calendarYear.value, calendarMonth.value, 0).getDate();
            for (let i = offset - 1; i >= 0; i--) {
                const d = prevMonthLastDay - i;
                const m = calendarMonth.value === 0 ? 11 : calendarMonth.value - 1;
                const y = calendarMonth.value === 0 ? calendarYear.value - 1 : calendarYear.value;
                const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                days.push({ date: d, fullDate, currentMonth: false });
            }

            // Dny z aktuálního měsíce
            const daysInMonth = lastDayOfMonth.getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const fullDate = `${calendarYear.value}-${String(calendarMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                days.push({ date: d, fullDate, currentMonth: true });
            }

            // Dny z následujícího měsíce do zaplnění mřížky (42 polí)
            const remaining = 42 - days.length;
            for (let d = 1; d <= remaining; d++) {
                const m = calendarMonth.value === 11 ? 0 : calendarMonth.value + 1;
                const y = calendarMonth.value === 11 ? calendarYear.value + 1 : calendarYear.value;
                const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                days.push({ date: d, fullDate, currentMonth: false });
            }

            return days;
        });

        // Den je obsazen pouze pokud jsou VŠECHNY typy ubytování v areálu plné
        const isDateOccupied = (dateStr) => {
            if (!dateStr || !data.value.ceny.length) return false;
            return data.value.ceny.every(unit => 
                calendar.value[unit.typ]?.some(p => dateStr >= p.from && dateStr <= p.to)
            );
        };

        const isDatePartiallyOccupied = (dateStr) => {
            if (!dateStr || !data.value.ceny.length || !calendar.value) return false;
            const occupiedCount = data.value.ceny.filter(unit => 
                calendar.value[unit.typ]?.some(p => dateStr >= p.from && dateStr <= p.to)
            ).length;
            // Je obsazeno více než 0, ale méně než všechny kapacity
            return occupiedCount > 0 && occupiedCount < data.value.ceny.length;
        };

        const isPublicHoliday = computed(() => (dateStr) => {
            const holidays = ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"];
            const specific2026 = ["2026-04-03", "2026-04-06"]; // Velký pátek a Velikonoční pondělí 2026
            return dateStr && (holidays.includes(dateStr.substring(5)) || specific2026.includes(dateStr));
        });

        const isPastDay = (dateStr) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time for accurate day comparison
            return dateStr && new Date(dateStr) < today;
        };

        const isToday = computed(() => (dateStr) => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return dateStr === `${year}-${month}-${day}`;
        });

        const isDateSelected = computed(() => (dateStr) => dateStr && (dateStr === selectedDateFrom.value || dateStr === selectedDateTo.value));
        
        const isDateInRange = (dateStr) => {
            if (!selectedDateFrom.value || !selectedDateTo.value || !dateStr) return false;
            return dateStr > selectedDateFrom.value && dateStr < selectedDateTo.value;
        };

        const changeMonth = (delta) => {
            calendarMonth.value += delta;
            if (calendarMonth.value < 0) { calendarMonth.value = 11; calendarYear.value--; }
            else if (calendarMonth.value > 11) { calendarMonth.value = 0; calendarYear.value++; }
        };

        const totalPrice = computed(() => {
            const acc = data.value.ceny.find(c => c.typ === form.value.accommodation);
            if (!acc || !form.value.nights) return '0 Kč';
            const persons = selectedPersons.value === 'all' ? "1" : String(selectedPersons.value);
            const price = parseInt((acc.prices[persons] || acc.prices["1"]).replace(/[^\d]/g, ''));
            return (price * form.value.nights).toLocaleString('cs-CZ') + ' Kč';
        });

        const selectAccommodation = (typ) => {
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

            if (!selectedDateFrom.value || selectedDateTo.value || date === selectedDateFrom.value) {
                selectedDateFrom.value = date;
                selectedDateTo.value = '';
            } else {
                let tempDateFrom = selectedDateFrom.value;
                let tempDateTo = date;

                if (tempDateFrom > tempDateTo) {
                    [tempDateFrom, tempDateTo] = [tempDateTo, tempDateFrom];
                }

                // Kontrola obsazenosti v celém rozsahu
                let hasOverlap = false;
                let current = new Date(tempDateFrom);
                const end = new Date(tempDateTo);
                while (current <= end) {
                    const checkStr = current.toISOString().split('T')[0];
                    if (isDateOccupied(checkStr)) {
                        hasOverlap = true;
                        break;
                    }
                    current.setDate(current.getDate() + 1);
                }

                if (!hasOverlap) {
                    selectedDateFrom.value = tempDateFrom;
                    selectedDateTo.value = tempDateTo;
                } else {
                    selectedDateFrom.value = date;
                    selectedDateTo.value = '';
                }
            }
        };

        // Propojení kalendáře s formulářem
        watch([selectedDateFrom, selectedDateTo], ([f, t]) => {
            form.value.dateFrom = f;
            form.value.dateTo = t;
        });

        watch([() => form.value.dateFrom, () => form.value.dateTo], ([f, t]) => {
            selectedDateFrom.value = f;
            selectedDateTo.value = t;
        });

        watch([() => form.value.dateFrom, () => form.value.dateTo], ([f, t]) => {
            if (f && t) {
                const diff = Math.ceil((new Date(t) - new Date(f)) / 86400000);
                form.value.nights = diff > 0 ? diff : 1;
                if (diff <= 0) form.value.dateTo = '';
            }
        });

        onMounted(loadData);
        const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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

        return { isMenuOpen, showAllTrips, showAllGallery, showAllMenu, selectedDifficulty, selectedPersons, selectedDateFrom, selectedDateTo, isAvailable, selectAccommodation, selectCalendarDay, isDateSelected, isDateInRange, isPastDay, isPublicHoliday, isDatePartiallyOccupied, totalPrice, nightsCount, getStayPrice, filteredTrips, displayTrips, filteredPrices, randomPhotos, data, form, scrollTo, submitForm, calendar, calendarMonth, calendarYear, monthNames, calendarDays, isDateOccupied, isToday, changeMonth };
    }
    }).mount('#app');
}

initApp();