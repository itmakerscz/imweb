async function renderOccupancy() {
    const container = document.getElementById('occupancy-overview');
    if (!container) return;

    try {
        const response = await fetch('calendar.json');
        const calendar = await response.json();
        
        let html = '<div class="occupancy-list" style="display: grid; gap: 1rem;">';
        
        for (const [unit, periods] of Object.entries(calendar)) {
            const periodsHtml = periods.length > 0 
                ? periods.map(p => `<span style="display:block; font-size: 0.85rem;">📅 ${p.from} — ${p.to}</span>`).join('')
                : '<span style="color: #4caf50; font-size: 0.85rem;">Aktuálně volno</span>';

            html += `
                <div class="occupancy-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong style="display:block; margin-bottom: 5px; color: #2d4635;">${unit}</strong>
                    ${periodsHtml}
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Chyba při načítání kalendáře:', error);
        container.innerHTML = '<p>Informace o obsazenosti nejsou momentálně dostupné.</p>';
    }
}

document.addEventListener('DOMContentLoaded', renderOccupancy);