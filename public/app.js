// app.js - Frontend Logic
// ENGSE207 Software Architecture - Week 3 Lab

const API_BASE = '/api/tasks';

// ========================================
// PART 1: STATE MANAGEMENT
// ========================================
let allTasks = [];
let currentFilter = 'ALL';


// ========================================
// PART 2: DOM ELEMENTS
// ========================================
const addTaskForm = document.getElementById('addTaskForm');
const statusFilter = document.getElementById('statusFilter');
const loadingOverlay = document.getElementById('loadingOverlay');

// Task list containers
const todoTasks = document.getElementById('todoTasks');
const progressTasks = document.getElementById('progressTasks');
const doneTasks = document.getElementById('doneTasks');

// Task counters (Assuming these IDs exist in index.html)
const todoCount = document.getElementById('todoCount');
const progressCount = document.getElementById('progressCount');
const doneCount = document.getElementById('doneCount');


// ========================================
// PART 3: API FUNCTIONS - FETCH TASKS (R)
// ========================================
async function fetchTasks() {
    showLoading();
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Assuming API returns { success: true, data: tasks } as per server.js minimal example
        allTasks = data.data || []; 
        renderTasks();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        alert('❌ Failed to load tasks. Please refresh the page.');
    } finally {
        hideLoading();
    }
}


// ========================================
// PART 4: API FUNCTIONS - CREATE TASK (C)
// ========================================
async function createTask(taskData) {
    showLoading();
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create task');
        }
        
        const data = await response.json();
        allTasks.unshift(data.data); // Add new task (data.data assumes server returns new task object)
        renderTasks();
        
        addTaskForm.reset();
        alert('✅ Task created successfully!');
    } catch (error) {
        console.error('Error creating task:', error);
        alert(`❌ Failed to create task: ${error.message}`);
    } finally {
        hideLoading();
    }
}


// ========================================
// PART 5: API FUNCTIONS - UPDATE STATUS (U - PATCH)
// ========================================
async function updateTaskStatus(taskId, newStatus) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/${taskId}`, {
            method: 'PUT', // Using PUT from server.js minimal example, though PATCH is often preferred for status only
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update the task in the local state array
        const updatedTask = data.data;
        const index = allTasks.findIndex(task => task.id === updatedTask.id);
        if (index !== -1) {
            allTasks[index] = updatedTask;
        }
        
        renderTasks();
        alert(`Status updated to ${newStatus}!`);
    } catch (error) {
        console.error('Error updating task status:', error);
        alert(`❌ Failed to update task status: ${error.message}`);
    } finally {
        hideLoading();
    }
}


// ========================================
// PART 6: API FUNCTIONS - DELETE TASK (D)
// ========================================
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete task: ${response.status}`);
        }
        
        // Remove task from local state array
        allTasks = allTasks.filter(task => task.id !== taskId);
        
        renderTasks();
        alert('🗑️ Task deleted successfully!');
    } catch (error) {
        console.error('Error deleting task:', error);
        alert(`❌ Failed to delete task: ${error.message}`);
    } finally {
        hideLoading();
    }
}


// ========================================
// PART 7: RENDER FUNCTIONS - MAIN RENDER
// ========================================
function renderTasks() {
    // Clear all lists
    if (todoTasks) todoTasks.innerHTML = '';
    if (progressTasks) progressTasks.innerHTML = '';
    if (doneTasks) doneTasks.innerHTML = '';
    
    // Filter tasks
    let filteredTasks = allTasks;
    if (currentFilter !== 'ALL') {
        filteredTasks = allTasks.filter(task => task.status === currentFilter);
    }
    
    // Separate by status
    const todo = filteredTasks.filter(t => t.status === 'TODO');
    const progress = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
    const done = filteredTasks.filter(t => t.status === 'DONE');
    
    // Update counters (ensure elements exist before accessing textContent)
    if (todoCount) todoCount.textContent = todo.length;
    if (progressCount) progressCount.textContent = progress.length;
    if (doneCount) doneCount.textContent = done.length;
    
    // Render each column (ensure elements exist before calling renderTaskList)
    if (todoTasks) renderTaskList(todo, todoTasks, 'TODO');
    if (progressTasks) renderTaskList(progress, progressTasks, 'IN_PROGRESS');
    if (doneTasks) renderTaskList(done, doneTasks, 'DONE');
}


// ========================================
// PART 8: RENDER FUNCTIONS - RENDER LIST
// ========================================
function renderTaskList(tasks, container, currentStatus) {
    if (tasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No tasks yet</p></div>';
        return;
    }
    
    tasks.forEach(task => {
        const card = createTaskCard(task, currentStatus);
        container.appendChild(card);
    });
}


// ========================================
// PART 9: RENDER FUNCTIONS - CREATE CARD
// ========================================
function createTaskCard(task, currentStatus) {
    const card = document.createElement('div');
    card.className = 'task-card';
    
    const priorityClass = `priority-${task.priority.toLowerCase()}`;
    
    card.innerHTML = `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <span class="priority-badge ${priorityClass}">${task.priority}</span>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
            Created: ${formatDate(task.created_at)}
        </div>
        <div class="task-actions">
            ${createStatusButtons(task.id, currentStatus)}
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">
                🗑️ Delete
            </button>
        </div>
    `;
    
    return card;
}


// ========================================
// PART 10: HELPER FUNCTIONS - STATUS BUTTONS
// ========================================
function createStatusButtons(taskId, currentStatus) {
    const buttons = [];
    
    // Previous Status Button (TODO)
    if (currentStatus !== 'TODO') {
        buttons.push(`
            <button class="btn btn-secondary btn-sm" onclick="updateTaskStatus(${taskId}, 'TODO')">
                ← To Do
            </button>
        `);
    }
    
    // In Progress Status Button
    if (currentStatus === 'TODO' || currentStatus === 'DONE') {
        buttons.push(`
            <button class="btn btn-warning btn-sm" onclick="updateTaskStatus(${taskId}, 'IN_PROGRESS')">
                ${currentStatus === 'TODO' ? '→ In Progress' : '← In Progress'}
            </button>
        `);
    }

    // Next Status Button (DONE)
    if (currentStatus !== 'DONE') {
        buttons.push(`
            <button class="btn btn-success btn-sm" onclick="updateTaskStatus(${taskId}, 'DONE')">
                → Done
            </button>
        `);
    }
    
    return buttons.join('');
}


// ========================================
// PART 11: UTILITY FUNCTIONS
// ========================================
function escapeHtml(text) {
    // Check if text is null or undefined before processing
    if (text === null || text === undefined) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return 'N/A';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}


// ========================================
// PART 12: EVENT LISTENERS
// ========================================
if (addTaskForm) {
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Note: Assuming input IDs are taskTitle, taskDescription, taskPriority based on common practice/missing context
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        
        if (!title) {
            alert('Please enter a task title');
            return;
        }
        
        createTask({ title, description, priority });
    });
}


if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderTasks();
    });
}


// ========================================
// PART 13: INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Task Board App Initialized');
    console.log('📊 Architecture: Monolithic');
    // We only fetch data once on load
    fetchTasks();
});


// ========================================
// PART 14: GLOBAL FUNCTION EXPOSURE
// ========================================
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;