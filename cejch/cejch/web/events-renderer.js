async function renderEvents() {
    const grid = document.getElementById('events-grid');
    try {
        const response = await fetch('akce.json');
        const events = await response.json();
        
        grid.innerHTML = events.map(akce => `
            <article class="event-card">
                <img src="${akce.img}" alt="${akce.title}" class="event-image">
                <div class="event-content">
                    <span class="event-date">${akce.date}</span>
                    <h3>${akce.title}</h3>
                    <p>${akce.desc}</p>
                </div>
            </article>
        `).join('');
        
    } catch (error) {
        console.error('Chyba při načítání akcí:', error);
        grid.innerHTML = '<p>Nepodařilo se načíst plánované akce.</p>';
    }
}

// Spustit po načtení DOMu
document.addEventListener('DOMContentLoaded', renderEvents);