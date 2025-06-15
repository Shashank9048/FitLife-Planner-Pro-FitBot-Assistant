document.addEventListener('DOMContentLoaded', () => {
    // ==================================================
    // --- FitBot Configuration ---
    // ==================================================

    // --- WARNING --- WARNING --- WARNING ---
    // ---          API KEY SECURITY           ---
    // Embedding API keys directly in client-side JavaScript is HIGHLY INSECURE.
    // Anyone can view your page source and steal your key.
    // This leads to unauthorized use and potentially significant costs.
    //
    // ** FOR PRODUCTION, YOU MUST USE A BACKEND PROXY: **
    // 1. Create a simple server (Node.js, Python, etc.).
    // 2. Store your API key securely on the server (e.g., environment variable).
    // 3. Create an endpoint on your server (e.g., /api/chat).
    // 4. Your frontend sends messages to YOUR server's endpoint.
    // 5. Your server receives the message, adds the API key, calls the Gemini API,
    //    and sends the response back to the frontend.
    //
    // This key is included here ONLY for local demonstration purposes.
    // Replace "YOUR_API_KEY_HERE" with your actual key for local testing.
    // DO NOT DEPLOY THIS CODE WITH THE KEY EMBEDDED.
    const GEMINI_API_KEY = "API_KEY_HERE"; // <<< --- REPLACE WITH YOUR KEY FOR LOCAL TESTING ONLY
    // --- END SECURITY WARNING ---

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const MAX_HISTORY_TURNS = 5;

    const systemPrompt = `
You are FitBot, a friendly fitness assistant chatbot. You answer user questions related to workouts, diet, and body transformation tips in a supportive and motivational tone. You are an expert in strength training, fat loss, muscle gain, personalized workout plans (beginner to advanced, home/gym), nutritional guidance (bulking, cutting, maintenance), calorie/macro tracking, supplements (creatine, whey, etc.), motivation, and recovery.

Your personality is supportive, motivational, non-judgmental, and encouraging, like a personal fitness coach. You make users feel empowered.

Your responses should be:
* Clear and easy to understand.
* Actionable with realistic steps or examples (e.g., list specific exercises, sets, reps for workouts; suggest specific meal ideas for diets).
* Motivational and positive.
* Tailored based on user goals, experience, equipment etc., if provided.
* Formatted cleanly: Do NOT use markdown like asterisks (*) or hash (#). Use plain text and line breaks for structure.
* Relatively concise where appropriate but provide necessary detail.

Do NOT diagnose medical issues or give medical advice. Encourage users to consult a healthcare professional for health concerns.

Do NOT answer out-of-domain questions (politics, history, general knowledge unrelated to fitness). If asked, politely state you specialize in fitness and redirect to their health goals.

End responses with a short motivational note like "You've got this!", "Stay consistent!", or "Keep crushing it!".
`.trim();

    // --- Chatbot State ---
    let chatHistory = [];

    // --- Chatbot DOM Elements ---
    const chatToggleButton = document.getElementById('chat-toggle-button');
    const chatWidget = document.getElementById('chat-widget');
    const closeChatButton = document.getElementById('close-chat');
    const chatBody = document.getElementById('chat-body');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('send-button');

    // ==================================================
    // --- FitLife Planner Elements & State ---
    // ==================================================
    const sidebarNav = document.querySelector('.sidebar .nav');
    const sections = document.querySelectorAll('.main-content .section');
    const workoutSectionContainer = document.getElementById('workout');
    const workoutForm = document.getElementById('workoutForm');
    const mealForm = document.getElementById('mealForm');
    const weeklyWorkoutsContainer = document.getElementById('weeklyWorkouts');
    const todaysWorkoutContainer = document.getElementById('todaysWorkoutContent');
    const todayDayNameSpan = document.getElementById('todayDayName');
    const mealEntriesContainer = document.getElementById('mealEntries');
    const workoutChartContainer = document.getElementById('workoutChart');
    const progressStatsContainer = document.getElementById('progressStats');
    const progressChartContainer = document.getElementById('progressWorkoutChart');
    const workoutChartDetailPopup = document.getElementById('chartWorkoutDetail');
    const progressChartDetailPopup = document.getElementById('chartProgressDetail');

    // Planner Form Elements
    const editWorkoutIdInput = document.getElementById('editWorkoutId');
    const formTitle = document.getElementById('formTitle');
    const weekdaySelect = document.getElementById('weekdaySelect');
    const exerciseNameInput = document.getElementById('exerciseName');
    const exerciseDurationInput = document.getElementById('exerciseDuration');
    const exerciseSetsInput = document.getElementById('exerciseSets');
    const saveWorkoutBtn = document.getElementById('saveWorkoutBtn');
    const cancelEditWorkoutBtn = document.getElementById('cancelEditWorkoutBtn');
    const editMealIdInput = document.getElementById('editMealId');
    const mealNameInput = document.getElementById('mealName');
    const mealCaloriesInput = document.getElementById('mealCalories');
    const mealProteinInput = document.getElementById('mealProtein');
    const mealDateInput = document.getElementById('mealDate');
    const saveMealBtn = document.getElementById('saveMealBtn');
    const cancelEditMealBtn = document.getElementById('cancelEditMealBtn');

    // Planner State
    let workouts = [];
    let meals = [];
    let currentEditWorkoutId = null;
    let currentEditMealId = null;
    let activeChartPopupElement = null;

    // ==================================================
    // --- Shared Utilities ---
    // ==================================================
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
        return str.replace(/[&<>"']/g, m => map[m]);
    }
    
    function getCurrentDayName() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date().getDay()];
    }
    
    function getStartOfWeek(date = new Date()) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    function calculateAverage(items, key) {
        if (!items?.length) return 0;
        const total = items.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
        return total / items.length;
    }

    // ==================================================
    // --- FitLife Planner Logic ---
    // ==================================================

    // --- Planner Data Storage ---
    const storePlannerData = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    };
    
    const loadPlannerData = () => {
        try {
            workouts = JSON.parse(localStorage.getItem('workouts')) || [];
        } catch (error) {
            console.error("Error loading workouts:", error);
            workouts = [];
        }
        
        try {
            meals = JSON.parse(localStorage.getItem('meals')) || [];
        } catch (error) {
            console.error("Error loading meals:", error);
            meals = [];
        }
    };

    // --- Planner Navigation ---
    sidebarNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.section) {
            showPlannerSection(e.target.dataset.section);
        }
    });
    
    function showPlannerSection(sectionId) {
        sections.forEach(section => section.classList.remove('active'));
        const activeSection = document.getElementById(sectionId);
        
        if (activeSection) {
            activeSection.classList.add('active');
            clearChartPopups();
            
            switch(sectionId) {
                case 'workout':
                    renderTodaysWorkoutPlan();
                    renderWorkoutChart();
                    break;
                case 'meal':
                    renderMeals();
                    break;
                case 'progress':
                    renderProgressStats();
                    renderProgressChart();
                    break;
            }
        } else {
            console.error("Section not found:", sectionId);
        }
    }

    // --- Planner Rendering Functions ---
    function renderWorkouts() {
        if (!weeklyWorkoutsContainer) return;
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const workoutsByDay = workouts.reduce((acc, workout) => {
            (acc[workout.weekday] = acc[workout.weekday] || []).push(workout);
            return acc;
        }, {});
        
        const openDays = new Set(
            Array.from(weeklyWorkoutsContainer.querySelectorAll('.weekday-section.open'))
                .map(el => el.dataset.day)
        );
        
        weeklyWorkoutsContainer.innerHTML = days.map(day => {
            const dayExercises = workoutsByDay[day]?.sort((a, b) => a.id - b.id) || [];
            const isOpen = openDays.has(day);
            const exerciseHTML = dayExercises.length === 0 
                ? '<p><em>No exercises planned for this day.</em></p>' 
                : dayExercises.map(renderExerciseItemHTML).join('');
            
            return `
                <div class="card weekday-section ${isOpen ? 'open' : ''}" data-day="${day}">
                    <h3>${day}</h3>
                    <div class="weekday-exercises">${exerciseHTML}</div>
                </div>
            `;
        }).join('');
    }
    
    function renderTodaysWorkoutPlan() {
        if (!todaysWorkoutContainer || !todayDayNameSpan) return;
        
        const currentDay = getCurrentDayName();
        todayDayNameSpan.textContent = currentDay;
        const todaysExercises = workouts
            .filter(w => w.weekday === currentDay)
            .sort((a, b) => a.id - b.id);
        
        if (todaysExercises.length === 0) {
            todaysWorkoutContainer.innerHTML = `<p><em>Rest day or no workouts planned for today.</em></p>`;
        } else {
            todaysWorkoutContainer.innerHTML = todaysExercises.map(renderExerciseItemHTML).join('');
        }
    }
    
    function renderExerciseItemHTML(exercise) {
        const completedDateStr = exercise.completed && exercise.completedDate 
            ? `<small>Completed: ${new Date(exercise.completedDate).toLocaleDateString()}</small>` 
            : '';
        const title = exercise.completed ? 'Mark as incomplete' : 'Mark as completed';
        
        return `
            <div class="exercise-item ${exercise.completed ? 'completed' : ''}" data-id="${exercise.id}">
                <div class="exercise-details">
                    <h4>${escapeHTML(exercise.name ?? 'Unnamed Exercise')}</h4>
                    <p>Duration: ${exercise.duration ?? 0} mins</p>
                    <p>Sets/Reps: ${escapeHTML(exercise.setsReps ?? 'N/A')}</p>
                    ${completedDateStr}
                </div>
                <div class="item-actions">
                    <input type="checkbox" class="complete-checkbox" ${exercise.completed ? 'checked' : ''} title="${title}">
                    <button class="action-btn edit-btn" title="Edit exercise">Edit</button>
                    <button class="action-btn delete-btn" title="Delete exercise">Delete</button>
                </div>
            </div>
        `;
    }
    
    function renderRelevantCharts() {
        if (document.getElementById('workout')?.classList.contains('active')) renderWorkoutChart();
        if (document.getElementById('progress')?.classList.contains('active')) {
            renderProgressChart();
            renderProgressStats();
        }
    }
    
    function renderMeals() {
        if (!mealEntriesContainer) return;
        
        const sortedMeals = [...meals].sort((a, b) => {
            const dateDiff = new Date(b.date) - new Date(a.date);
            return dateDiff === 0 ? b.id - a.id : dateDiff;
        });
        
        mealEntriesContainer.innerHTML = sortedMeals.map(meal => {
            const dateString = meal.date || new Date().toISOString().split('T')[0];
            const mealLocalDate = new Date(dateString + 'T00:00:00Z');
            const displayDate = mealLocalDate.toLocaleDateString(undefined, {
                timeZone: 'UTC',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
            
            return `
                <div class="meal-item" data-id="${meal.id}">
                    <div class="meal-details">
                        <h4>${escapeHTML(meal.name ?? 'Unnamed Meal')} <span>(${displayDate})</span></h4>
                        <p>Calories: ${meal.calories ?? 0} kcal</p>
                        <p>Protein: ${(meal.protein ?? 0).toFixed(1)} g</p>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn edit-btn" title="Edit meal">Edit</button>
                        <button class="action-btn delete-btn" title="Delete meal">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        if (meals.length === 0) {
            mealEntriesContainer.innerHTML = '<p><em>No meals logged yet. Add one above!</em></p>';
        }
    }
    
    function renderProgressStats() {
        if (!progressStatsContainer) return;
        
        const totalPlanned = workouts.length;
        const completed = workouts.filter(w => w.completed);
        const totalCompleted = completed.length;
        const totalMinutes = completed.reduce((sum, w) => sum + (parseInt(w.duration) || 0), 0);
        const totalMeals = meals.length;
        const avgCal = calculateAverage(meals, 'calories');
        const avgProt = calculateAverage(meals, 'protein');
        
        progressStatsContainer.innerHTML = `
            <h4>Workout Stats</h4>
            <p>Total Exercises Planned: <strong>${totalPlanned}</strong></p>
            <p>Completed Exercises: <strong>${totalCompleted}</strong></p>
            <p>Total Workout Time (Completed): <strong>${totalMinutes} minutes</strong></p>
            <hr>
            <h4>Nutrition Stats</h4>
            <p>Total Meals Logged: <strong>${totalMeals}</strong></p>
            ${totalMeals > 0 ? `<p>Average Calories / Meal: <strong>${avgCal.toFixed(0)} kcal</strong></p>` : ''}
            ${totalMeals > 0 ? `<p>Average Protein / Meal: <strong>${avgProt.toFixed(1)} g</strong></p>` : ''}
        `;
    }

    // --- Planner Event Handlers & Actions ---
    workoutForm.addEventListener('submit', handleWorkoutFormSubmit);
    cancelEditWorkoutBtn?.addEventListener('click', resetWorkoutForm);
    workoutSectionContainer?.addEventListener('click', handleWorkoutSectionClick);
    mealForm.addEventListener('submit', handleMealFormSubmit);
    cancelEditMealBtn?.addEventListener('click', resetMealForm);
    mealEntriesContainer?.addEventListener('click', handleMealEntriesClick);
    
    [workoutChartContainer, progressChartContainer].forEach(container => {
        if (container) {
            container.addEventListener('click', handlePlannerChartBarClick);
            container.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') handlePlannerChartBarClick(e);
            });
        }
    });

    function handleWorkoutFormSubmit(e) {
        e.preventDefault();
        
        const duration = parseInt(exerciseDurationInput.value);
        const name = exerciseNameInput.value.trim();
        const setsReps = exerciseSetsInput.value.trim();
        
        if (name === '') {
            alert("Please enter an exercise name.");
            exerciseNameInput.focus();
            return;
        }
        
        if (isNaN(duration) || duration <= 0) {
            alert("Please enter a valid positive number for duration.");
            exerciseDurationInput.focus();
            return;
        }
        
        if (setsReps === '') {
            alert("Please enter sets/reps information.");
            exerciseSetsInput.focus();
            return;
        }
        
        const existingWorkout = currentEditWorkoutId 
            ? workouts.find(w => w.id === currentEditWorkoutId)
            : null;
        
        const workoutData = {
            name,
            duration,
            setsReps,
            weekday: weekdaySelect.value,
            completed: existingWorkout?.completed ?? false,
            completedDate: existingWorkout?.completedDate ?? null,
            id: currentEditWorkoutId || Date.now()
        };
        
        if (currentEditWorkoutId) {
            const index = workouts.findIndex(w => w.id === currentEditWorkoutId);
            if (index > -1) {
                workouts[index] = workoutData;
            } else {
                console.error("Couldn't find workout to update");
            }
        } else {
            workouts.push(workoutData);
        }
        
        storePlannerData('workouts', workouts);
        resetWorkoutForm();
        renderWorkouts();
        renderTodaysWorkoutPlan();
        renderRelevantCharts();
    }
    
    function resetWorkoutForm() {
        if (!workoutForm) return;
        
        workoutForm.reset();
        currentEditWorkoutId = null;
        
        if (editWorkoutIdInput) editWorkoutIdInput.value = '';
        if (formTitle) formTitle.textContent = 'Add Exercise';
        if (saveWorkoutBtn) saveWorkoutBtn.textContent = 'Add Exercise';
        if (cancelEditWorkoutBtn) cancelEditWorkoutBtn.style.display = 'none';
    }
    
    function handleWorkoutSectionClick(e) {
        const target = e.target;
        const exerciseItem = target.closest('.exercise-item');
        const weekdayHeader = target.closest('#weeklyWorkouts .weekday-section h3');
        const weekdaySection = target.closest('#weeklyWorkouts .weekday-section');
        
        if (weekdayHeader && weekdaySection) {
            weekdaySection.classList.toggle('open');
            return;
        }
        
        if (exerciseItem?.dataset.id) {
            const workoutId = parseInt(exerciseItem.dataset.id);
            
            if (target.classList.contains('edit-btn')) {
                startEditWorkout(workoutId);
            } else if (target.classList.contains('delete-btn')) {
                deleteWorkout(workoutId);
            } else if (target.classList.contains('complete-checkbox')) {
                toggleWorkoutComplete(workoutId, target.checked);
            }
        }
    }
    
    function startEditWorkout(id) {
        const workout = workouts.find(w => w.id === id);
        if (!workout) return console.error("Workout not found:", id);
        
        const accordionSectionElement = weeklyWorkoutsContainer?.querySelector(
            `.weekday-section[data-day="${workout.weekday}"]`
        );
        
        if (accordionSectionElement && !accordionSectionElement.classList.contains('open')) {
            accordionSectionElement.classList.add('open');
        }
        
        currentEditWorkoutId = id;
        editWorkoutIdInput.value = id;
        weekdaySelect.value = workout.weekday;
        exerciseNameInput.value = workout.name ?? '';
        exerciseDurationInput.value = workout.duration ?? '';
        exerciseSetsInput.value = workout.setsReps ?? '';
        
        formTitle.textContent = 'Edit Exercise';
        saveWorkoutBtn.textContent = 'Update Exercise';
        cancelEditWorkoutBtn.style.display = 'inline-block';
        
        workoutForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        exerciseNameInput?.focus();
    }
    
    function deleteWorkout(id) {
        if (confirm('Are you sure you want to delete this exercise?')) {
            workouts = workouts.filter(w => w.id !== id);
            storePlannerData('workouts', workouts);
            renderWorkouts();
            renderTodaysWorkoutPlan();
            renderRelevantCharts();
            clearChartPopups();
        }
    }
    
    function toggleWorkoutComplete(id, isCompleted) {
        const index = workouts.findIndex(w => w.id === id);
        
        if (index > -1) {
            workouts[index].completed = isCompleted;
            workouts[index].completedDate = isCompleted ? new Date().toISOString() : null;
            storePlannerData('workouts', workouts);
            renderWorkouts();
            renderTodaysWorkoutPlan();
            renderRelevantCharts();
        } else {
            console.error("Workout not found for toggle:", id);
        }
    }
    
    function handleMealFormSubmit(e) {
        e.preventDefault();
        
        const calories = parseFloat(mealCaloriesInput.value);
        const protein = parseFloat(mealProteinInput.value);
        const name = mealNameInput.value.trim();
        const date = mealDateInput.value;
        
        if (name === '') {
            alert("Please enter a meal name.");
            mealNameInput.focus();
            return;
        }
        
        if (isNaN(calories)) {
            alert("Enter valid calories.");
            mealCaloriesInput.focus();
            return;
        }
        
        if (isNaN(protein)) {
            alert("Enter valid protein.");
            mealProteinInput.focus();
            return;
        }
        
        if (!date) {
            alert("Select a date.");
            mealDateInput.focus();
            return;
        }
        
        const mealData = {
            name,
            calories,
            protein,
            date,
            id: currentEditMealId || Date.now()
        };
        
        if (currentEditMealId) {
            const index = meals.findIndex(m => m.id === currentEditMealId);
            if (index > -1) meals[index] = mealData;
        } else {
            meals.push(mealData);
        }
        
        storePlannerData('meals', meals);
        resetMealForm();
        renderMeals();
        
        if (document.getElementById('progress')?.classList.contains('active')) {
            renderProgressStats();
        }
    }
    
    function resetMealForm() {
        if (!mealForm) return;
        
        mealForm.reset();
        currentEditMealId = null;
        
        if (editMealIdInput) editMealIdInput.value = '';
        if (saveMealBtn) saveMealBtn.textContent = 'Add Meal';
        if (cancelEditMealBtn) cancelEditMealBtn.style.display = 'none';
        if (mealDateInput) mealDateInput.valueAsDate = new Date();
    }
    
    function handleMealEntriesClick(e) {
        const target = e.target;
        const mealItem = target.closest('.meal-item');
        
        if (!mealItem?.dataset.id) return;
        
        const mealId = parseInt(mealItem.dataset.id);
        
        if (target.classList.contains('edit-btn')) {
            startEditMeal(mealId);
        } else if (target.classList.contains('delete-btn')) {
            deleteMeal(mealId);
        }
    }
    
    function startEditMeal(id) {
        const meal = meals.find(m => m.id === id);
        if (!meal) return;
        
        currentEditMealId = id;
        editMealIdInput.value = id;
        mealNameInput.value = meal.name ?? '';
        mealCaloriesInput.value = meal.calories ?? '';
        mealProteinInput.value = meal.protein ?? '';
        mealDateInput.value = meal.date ?? '';
        
        saveMealBtn.textContent = 'Update Meal';
        cancelEditMealBtn.style.display = 'inline-block';
        mealForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        mealNameInput?.focus();
    }
    
    function deleteMeal(id) {
        if (confirm('Delete this meal log?')) {
            meals = meals.filter(m => m.id !== id);
            storePlannerData('meals', meals);
            renderMeals();
            
            if (document.getElementById('progress')?.classList.contains('active')) {
                renderProgressStats();
            }
        }
    }
    
    function handlePlannerChartBarClick(e) {
        const barWrapper = e.target.closest('.bar-wrapper');
        
        if (barWrapper?.dataset.dayIndex !== undefined) {
            e.preventDefault();
            const dayIndex = parseInt(barWrapper.dataset.dayIndex);
            let targetPopupElement = null;
            
            if (e.currentTarget === workoutChartContainer) {
                targetPopupElement = workoutChartDetailPopup;
            } else if (e.currentTarget === progressChartContainer) {
                targetPopupElement = progressChartDetailPopup;
            }
            
            if (targetPopupElement) {
                if (targetPopupElement.classList.contains('visible') && 
                    activeChartPopupElement === targetPopupElement && 
                    targetPopupElement.dataset.activeDayIndex == dayIndex) {
                    clearChartPopups();
                } else {
                    showChartWorkoutDetails(dayIndex, targetPopupElement);
                }
            }
        }
    }
    
    function showChartWorkoutDetails(dayIndex, popupElement) {
        const daysOfWeekFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = daysOfWeekFull[dayIndex];
        const startOfWeek = getStartOfWeek();
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        
        const completedOnDay = workouts
            .filter(w => w.completed && w.completedDate && 
                   new Date(w.completedDate).getDay() === dayIndex && 
                   new Date(w.completedDate) >= startOfWeek && 
                   new Date(w.completedDate) < endOfWeek)
            .sort((a, b) => a.id - b.id);
        
        let content = `<h5>Completed on ${dayName}</h5><ul>`;
        
        if (completedOnDay.length === 0) {
            content += `<li><em>None this week.</em></li>`;
        } else {
            completedOnDay.forEach(w => {
                content += `<li>${escapeHTML(w.name ?? '?')} (${w.duration ?? 0} min)</li>`;
            });
        }
        
        content += `</ul>`;
        
        clearChartPopups();
        popupElement.innerHTML = content;
        popupElement.classList.add('visible');
        popupElement.dataset.activeDayIndex = dayIndex;
        activeChartPopupElement = popupElement;
    }
    
    function clearChartPopups() {
        [workoutChartDetailPopup, progressChartDetailPopup].forEach(popup => {
            if (popup) {
                popup.classList.remove('visible');
                popup.removeAttribute('data-active-day-index');
            }
        });
        
        activeChartPopupElement = null;
    }
    
    function renderWorkoutChart() {
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = Array(7).fill(0);
        const start = getStartOfWeek();
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        
        workouts.forEach(ex => {
            if (ex.completed && ex.completedDate) {
                try {
                    const d = new Date(ex.completedDate);
                    if (!isNaN(d) && d >= start && d < end) {
                        data[d.getDay()] += parseInt(ex.duration) || 0;
                    }
                } catch (e) {
                    console.error("Invalid date found in workout:", ex.completedDate);
                }
            }
        });
        
        renderGenericChart(workoutChartContainer, data, labels, 'm', 'workout');
    }
    
    function renderProgressChart() {
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = Array(7).fill(0);
        const start = getStartOfWeek();
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        
        workouts.forEach(ex => {
            if (ex.completed && ex.completedDate) {
                try {
                    const d = new Date(ex.completedDate);
                    if (!isNaN(d) && d >= start && d < end) {
                        data[d.getDay()] += parseInt(ex.duration) || 0;
                    }
                } catch(e) {
                    console.error("Invalid date found in workout:", ex.completedDate);
                }
            }
        });
        
        renderGenericChart(progressChartContainer, data, labels, 'm', 'progress');
    }
    
    function renderGenericChart(container, data, labels, unit = '', chartId = '') {
        if (!container) return console.error("Chart container missing for", chartId);
        
        container.innerHTML = '';
        const maxVal = Math.max(...data, 1);
        
        labels.forEach((label, index) => {
            const value = data[index] || 0;
            const height = Math.min(Math.max((value / maxVal) * 100, 0), 100);
            
            const wrapper = document.createElement('div');
            wrapper.className = 'bar-wrapper';
            wrapper.dataset.dayIndex = index;
            if (chartId) wrapper.dataset.chartId = chartId;
            wrapper.setAttribute('role', 'button');
            wrapper.setAttribute('aria-label', `${labels[index]}: ${value}${unit}`);
            wrapper.setAttribute('tabindex', '0');
            
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `max(${height}%, 2px)`;
            
            const valEl = document.createElement('div');
            valEl.className = 'bar-value';
            valEl.textContent = value > 0 ? `${value}${unit}` : '';
            
            const labelEl = document.createElement('div');
            labelEl.className = 'bar-label';
            labelEl.textContent = label;
            
            wrapper.appendChild(valEl);
            wrapper.appendChild(bar);
            wrapper.appendChild(labelEl);
            container.appendChild(wrapper);
        });
    }

    // ==================================================
    // --- FitBot Chatbot Logic ---
    // ==================================================

    // --- Chatbot Event Listeners ---
    chatToggleButton?.addEventListener('click', () => toggleChatWidget());
    closeChatButton?.addEventListener('click', () => toggleChatWidget(false));
    sendButton?.addEventListener('click', sendChatMessage);
    
    userInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    userInput?.addEventListener('input', adjustChatInputHeight);

    // --- Chatbot Functions ---
    function toggleChatWidget(forceState) {
        if (!chatWidget) return;
        
        const isActive = chatWidget.classList.contains('active');
        const shouldBeActive = forceState !== undefined ? forceState : !isActive;
        
        if (shouldBeActive) {
            chatWidget.classList.add('active');
            userInput?.focus();
        } else {
            chatWidget.classList.remove('active');
        }
    }

    function displayChatMessage(message, sender) {
        if (!chatBody) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // Basic text sanitation & remove markdown asterisks
        let safeMessage = escapeHTML(message).replace(/\*/g, "");
        // Convert newlines preserved by API to <br> tags for HTML display
        safeMessage = safeMessage.replace(/\n/g, '<br>');

        messageDiv.innerHTML = safeMessage; // Use innerHTML for <br> tags

        removeTypingIndicator();
        chatBody.appendChild(messageDiv);
        scrollChatToBottom();
    }

    function showTypingIndicator() {
        removeTypingIndicator(); // Remove old one first
        if (!chatBody) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.textContent = 'FitBot is typing...';
        chatBody.appendChild(typingDiv);
        scrollChatToBottom();
    }
    
    function removeTypingIndicator() {
        const indicator = chatBody?.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollChatToBottom() {
        setTimeout(() => {
            chatBody?.scrollTo({
                top: chatBody.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);
    }

    function adjustChatInputHeight() {
        if (!userInput) return;
        
        userInput.style.height = 'auto'; // Reset height
        let scrollHeight = userInput.scrollHeight;
        const maxHeight = 100; // Max height in pixels before scrolling
        
        if (scrollHeight > maxHeight) {
            userInput.style.height = `${maxHeight}px`;
            userInput.style.overflowY = 'auto';
        } else {
            // Add a pixel to prevent single-line jumpiness
            userInput.style.height = `${scrollHeight + (userInput.value ? 1 : 0)}px`;
            userInput.style.overflowY = 'hidden';
        }
    }

    async function sendChatMessage() {
        if (!userInput || !API_URL) return;
        
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        // --- CRITICAL: API Key Check ---
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
            console.error("CRITICAL SECURITY WARNING: Gemini API Key is missing or still set to the placeholder 'YOUR_API_KEY_HERE' in the script. Bot will not function. Please replace it for local testing and USE A BACKEND PROXY for deployment.");
            displayChatMessage("⚠️ Error: Bot not configured. API Key is missing. (Check browser console for details)", "bot");
            return; // Stop execution if key is missing/placeholder
        }
        // --- End Key Check ---

        displayChatMessage(userMessage, 'user');
        chatHistory.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        userInput.value = '';
        adjustChatInputHeight();
        showTypingIndicator();

        // --- Prepare payload with history ---
        const historyToSend = chatHistory.slice(-MAX_HISTORY_TURNS * 2);
        const payload = {
            contents: [
                { role: "user", parts: [{ text: systemPrompt }]},
                { role: "model", parts: [{ text: "Okay, I understand the instructions. I am FitBot, ready to help with fitness!"}]},
                ...historyToSend
            ],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1500
            }
        };
        
        // Remove system prompt from contents if using top level systemInstruction
        delete payload.contents[0];
        delete payload.contents[0];

        try {
            console.log("Sending payload:", JSON.stringify(payload, null, 2));

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMsg = `API Error (${response.status}): ${response.statusText}`;
                let errorDetails = {};
                
                try {
                    errorDetails = await response.json();
                    errorMsg += `\nDetails: ${JSON.stringify(errorDetails)}`;
                } catch {}
                
                console.error(errorMsg, errorDetails);
                throw new Error(`API request failed (${response.status}). Check console for details.`);
            }

            const data = await response.json();
            removeTypingIndicator();

            console.log("API Response data:", data);

            // Extract text, checking different possible locations
            let botResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            // Check for block reason
            if (!botResponseText && data?.candidates?.[0]?.finishReason === 'SAFETY') {
                console.warn("Response blocked due to safety settings.");
                botResponseText = "I can't respond to that due to safety guidelines. Can we focus on fitness?";
            } else if (!botResponseText) {
                console.warn("Received empty or unexpected response structure:", data);
                botResponseText = "Sorry, I had trouble understanding that. Could you please rephrase?";
            }

            displayChatMessage(botResponseText, 'bot');
            chatHistory.push({
                role: "model",
                parts: [{ text: botResponseText }]
            });

            // Prune history: Keep only the last N turns
            if (chatHistory.length > MAX_HISTORY_TURNS * 2) {
                chatHistory = chatHistory.slice(-MAX_HISTORY_TURNS * 2);
            }

        } catch (error) {
            console.error("Error sending/receiving chat message:", error);
            removeTypingIndicator();
            displayChatMessage(`Connection error: ${error.message || 'Could not reach FitBot.'}. Check console for details.`, 'bot');
        }
    }

    // ==================================================
    // --- Initial Application Load ---
    // ==================================================
    function initializeApp() {
        loadPlannerData();
        renderMeals();
        renderWorkouts();
        renderTodaysWorkoutPlan();
        showPlannerSection('workout');
    }

    initializeApp();

    // Global listener to close planner chart popups when clicking outside
    document.body.addEventListener('click', (e) => {
        if (!e.target.closest('.chart-container') && !e.target.closest('.chart-detail-popup.visible')) {
            clearChartPopups();
        }
    }, true);
});