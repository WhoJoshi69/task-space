'use client'
import React, { useState, useRef, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PlusIcon, CheckIcon, RefreshCwIcon, MoonIcon, SunIcon } from 'lucide-react'

interface Task {
    id: number
    title: string
    completed: boolean
    category: string
    assignee: string
    status: string
    subtasks: Task[]
}

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState('')
    const [newCategory, setNewCategory] = useState('')
    const [newAssignee, setNewAssignee] = useState('')
    const [completedToday, setCompletedToday] = useState(0)
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [expandedTasks, setExpandedTasks] = useState<number[]>([])
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [categories, setCategories] = useState<string[]>([])
    const [assignees, setAssignees] = useState<string[]>([])
    const statuses = ['Dev Pending ⏳', 'Dev In Progress 🔨', 'Done ✅', 'In QA 🧪',
        'On Hold ⏸️', 'Blocked ⛔', 'Deployed 🏁', 'In Integration 🛠️']
    const [newStatus, setNewStatus] = useState('Dev Pending ⏳')
    const editInputRef = useRef<HTMLInputElement>(null)
    const cursorRef = useRef<HTMLDivElement>(null)
    const [currentDateTime, setCurrentDateTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (editingTaskId !== null && editInputRef.current) {
            editInputRef.current.focus()
        }
    }, [editingTaskId])

    useEffect(() => {
        fetchTasks()
        fetchCategories()
        fetchAssignees()
    }, [])

    const fetchTasks = async () => {
        const response = await fetch('/api/tasks')
        const data = await response.json()
        setTasks(data)
    }

    const fetchCategories = async () => {
        const response = await fetch('/api/categories')
        const data = await response.json()
        setCategories(data)
    }

    const fetchAssignees = async () => {
        const response = await fetch('/api/assignees')
        const data = await response.json()
        setAssignees(data)
    }

    const addTask = async (parentId: number | null = null) => {
        const newTaskObj = {
            title: newTask || 'New Task',
            category: newCategory || 'Uncategorized',
            assignee: newAssignee || 'Unassigned',
            status: newStatus,
            parentId: parentId,
        }

        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTaskObj),
        })
        const createdTask = await response.json()

        if (parentId === null) {
            setTasks(prevTasks => [...prevTasks, createdTask])
        } else {
            setTasks(prevTasks => updateTaskInTree(prevTasks, parentId, task => ({
                ...task,
                subtasks: [...task.subtasks, createdTask]
            })))
        }

        if (!categories.includes(createdTask.category)) {
            setCategories(prev => [...prev, createdTask.category])
        }
        if (!assignees.includes(createdTask.assignee)) {
            setAssignees(prev => [...prev, createdTask.assignee])
        }
        setNewTask('')
        setNewCategory('')
        setNewAssignee('')
        setNewStatus('Dev Pending ⏳')
    }

    const toggleTask = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId) || tasks.flatMap(t => t.subtasks).find(t => t.id === taskId)
        if (task) {
            const updatedTask = { ...task, completed: !task.completed }
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTask),
            })
            setTasks(prevTasks => updateTaskInTree(prevTasks, taskId, () => updatedTask))
            if (updatedTask.completed) {
                setCompletedToday(prev => prev + 1)
            } else {
                setCompletedToday(prev => Math.max(0, prev - 1))
            }
        }
    }

    const editTaskName = async (taskId: number, newName: string) => {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newName }),
        })
        setTasks(prevTasks => updateTaskInTree(prevTasks, taskId, task => ({ ...task, title: newName })))
    }

    const editTaskCategory = async (taskId: number, newCategory: string) => {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: newCategory }),
        })
        setTasks(prevTasks => updateTaskInTree(prevTasks, taskId, task => ({ ...task, category: newCategory })))
        if (!categories.includes(newCategory)) {
            setCategories(prev => [...prev, newCategory])
        }
    }

    const editTaskAssignee = async (taskId: number, newAssignee: string) => {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignee: newAssignee }),
        })
        setTasks(prevTasks => updateTaskInTree(prevTasks, taskId, task => ({ ...task, assignee: newAssignee })))
        if (!assignees.includes(newAssignee)) {
            setAssignees(prev => [...prev, newAssignee])
        }
    }

    const editTaskStatus = async (id: number, newStatus: string) => {
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        })
        setTasks(prevTasks => updateTaskInTree(prevTasks, id, task => ({ ...task, status: newStatus })))
    }

    const updateTaskInTree = (tasks: Task[], id: number, updateFn: (task: Task) => Task): Task[] => {
        return tasks.map(task => {
            if (task.id === id) {
                return updateFn(task);
            }
            if (task.subtasks && task.subtasks.length > 0) {
                return { ...task, subtasks: updateTaskInTree(task.subtasks, id, updateFn) };
            }
            return task;
        });
    };

    const toggleExpand = (taskId: number) => {
        setExpandedTasks(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        )
    }

    const resetCompletedToday = () => {
        setCompletedToday(0)
    }

    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev)
    }

    const renderTask = (task: Task, level = 0) => (
        <div key={task.id} className="mb-2 task-item" style={{ marginLeft: `${level * 20}px` }}>
            <div className="flex items-center group space-x-4">
                <button
                    className="h-6 w-6 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full flex-shrink-0"
                    onClick={() => toggleExpand(task.id)}
                >
                    {task.subtasks.length > 0 && (
                        expandedTasks.includes(task.id) ? '▼' : '▶'
                    )}
                </button>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="sr-only"
                        id={`task-${task.id}`}
                    />
                    <label
                        htmlFor={`task-${task.id}`}
                        className={`flex items-center justify-center w-6 h-6 border-2 rounded-md cursor-pointer transition-all duration-200 ease-in-out ${task.completed
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-transparent border-gray-400 hover:border-blue-500'
                            }`}
                    >
                        {task.completed && (
                            <CheckIcon size={16} className="text-white" />
                        )}
                    </label>
                </div>
                <div className="flex-grow">
                    {editingTaskId === task.id ? (
                        <input
                            ref={editInputRef}
                            value={task.title}
                            onChange={(e) => editTaskName(task.id, e.target.value)}
                            onBlur={() => setEditingTaskId(null)}
                            onKeyPress={(e) => e.key === 'Enter' && setEditingTaskId(null)}
                            className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 w-full"
                        />
                    ) : (
                        <span
                            className={`cursor-pointer transition-all duration-200 ${task.completed ? 'line-through opacity-50' : 'hover:text-blue-400'}`}
                            onClick={() => setEditingTaskId(task.id)}
                        >
                            {task.title}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <select
                        value={task.category}
                        onChange={(e) => editTaskCategory(task.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded-lg transition-all duration-200 hover:bg-gray-700"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                    <select
                        value={task.assignee}
                        onChange={(e) => editTaskAssignee(task.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded-lg transition-all duration-200 hover:bg-gray-700"
                    >
                        {assignees.map(assignee => (
                            <option key={assignee} value={assignee}>{assignee}</option>
                        ))}
                    </select>
                    <select
                        value={task.status}
                        onChange={(e) => editTaskStatus(task.id, e.target.value)}
                        className="ml-2 bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded-lg transition-all duration-200 hover:bg-gray-700"
                    >
                        {statuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <button
                        className="text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1"
                        onClick={() => addTask(task.id)}
                    >
                        <PlusIcon size={16} />
                    </button>
                </div>
            </div>
            {expandedTasks.includes(task.id) && task.subtasks.map(subtask => renderTask(subtask, level + 1))}
        </div>
    )

    const completedTasks = tasks.reduce((count, task) => count + (task.completed ? 1 : 0) + task.subtasks.filter(st => st.completed).length, 0)
    const totalTasks = tasks.reduce((count, task) => count + 1 + task.subtasks.length, 0)
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const getCategoryData = () => {
        const categoryCount = tasks.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        return Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
    }

    const getAssigneeData = () => {
        const assigneeCount = tasks.reduce((acc, task) => {
            acc[task.assignee] = (acc[task.assignee] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        return Object.entries(assigneeCount).map(([name, value]) => ({ name, value }))
    }

    const getStatusData = () => {
        const statusCount = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    const COLORS = {
        category: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292'],
        assignee: ['#FFC300', '#DAF7A6', '#FF5733', '#C70039', '#900C3F', '#581845'],
        status: ['#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E', '#95A5A6']
    }

    const renderPieChart = (data: { name: string; value: number }[], title: string, colorKey: 'category' | 'assignee' | 'status') => (
        <div className="w-1/3 h-64">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[colorKey][index % COLORS[colorKey].length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-gray-800 p-2 rounded-lg shadow-lg">
                                        <p className="text-xs">{`${data.name}: ${data.value}`}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )

    return (
        <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} transition-colors duration-300`}>
            <style jsx global>{`
                .cursor-swirl {
                    width: 30px;
                    height: 30px;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    position: fixed;
                    pointer-events: none;
                    transition: 0.1s;
                    z-index: 9999;
                    animation: swirlRotate 4s linear infinite;
                }
                .cursor-swirl::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #fff;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                .cursor-swirl::after {
                    content: '';
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    animation: swirlPulse 2s ease-in-out infinite;
                }
                @keyframes swirlRotate {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                @keyframes swirlPulse {
                    0%, 100% {
                        width: 20px;
                        height: 20px;
                        opacity: 0.5;
                    }
                    50% {
                        width: 25px;
                        height: 25px;
                        opacity: 1;
                    }
                }
            `}</style>
            <div ref={cursorRef} className="cursor-swirl"></div>

            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="text-sm opacity-70">
                        {currentDateTime.toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </div>
                    <h1 className="text-2xl font-bold">DPWS&apos;s space</h1>
                    <button onClick={toggleDarkMode} className="p-2 rounded-full bg-gray-800 text-white transition-colors duration-200 hover:bg-gray-700">
                        {isDarkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
                    </button>
                </header>

                <main>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4">To Do</h2>
                        <div className="flex justify-between items-center mb-2">
                            <span>Progress</span>
                            <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-sm opacity-70 mt-1">
                            {completedTasks}/{totalTasks} completed
                        </div>
                    </div>

                    <div className="flex items-center mb-4 space-x-2">
                        <input
                            type="text"
                            placeholder="Add new task..."
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            className="flex-grow bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                            onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        />
                        <input
                            type="text"
                            list="categories"
                            placeholder="Category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-32 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                        />
                        <datalist id="categories">
                            {categories.map((category, index) => (
                                <option key={index} value={category} />
                            ))}
                        </datalist>
                        <input
                            type="text"
                            list="assignees"
                            placeholder="Assignee"
                            value={newAssignee}
                            onChange={(e) => setNewAssignee(e.target.value)}
                            className="w-32 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                        />
                        <datalist id="assignees">
                            {assignees.map((assignee, index) => (
                                <option key={index} value={assignee} />
                            ))}
                        </datalist>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-40 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                        >
                            {statuses.map((status, index) => (
                                <option key={index} value={status}>{status}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => addTask()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg transition-colors duration-200 hover:bg-blue-600"
                        >
                            <PlusIcon size={20} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {tasks.map(task => renderTask(task))}
                    </div>

                    <div className="mt-6 flex items-center">
                        <span className="mr-2">{completedToday} completed today</span>
                        <button
                            onClick={resetCompletedToday}
                            className="p-2 bg-gray-700 text-white rounded-lg transition-colors duration-200 hover:bg-gray-600"
                        >
                            <RefreshCwIcon size={16} />
                        </button>
                    </div>

                    <div className="mt-12 flex justify-between">
                        {renderPieChart(getCategoryData(), "Tasks by Category", 'category')}
                        {renderPieChart(getAssigneeData(), "Tasks by Assignee", 'assignee')}
                        {renderPieChart(getStatusData(), "Tasks by Status", 'status')}
                    </div>
                </main>
            </div>
        </div>
    )
}

const COLORS = {
    category: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292'],
    assignee: ['#FFC300', '#DAF7A6', '#FF5733', '#C70039', '#900C3F', '#581845'],
    status: ['#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E', '#95A5A6']
}

const renderPieChart = (data: { name: string; value: number }[], title: string, colorKey: 'category' | 'assignee' | 'status') => (
    <div className="w-1/3 h-64">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[colorKey][index % COLORS[colorKey].length]} />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="bg-gray-800 p-2 rounded-lg shadow-lg">
                                    <p className="text-xs">{`${data.name}: ${data.value}`}</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    </div>
)

return (
    <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} transition-colors duration-300`}>
        <style jsx global>{`
                .cursor-swirl {
                    width: 30px;
                    height: 30px;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    position: fixed;
                    pointer-events: none;
                    transition: 0.1s;
                    z-index: 9999;
                    animation: swirlRotate 4s linear infinite;
                }
                .cursor-swirl::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #fff;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                .cursor-swirl::after {
                    content: '';
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    animation: swirlPulse 2s ease-in-out infinite;
                }
                @keyframes swirlRotate {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                @keyframes swirlPulse {
                    0%, 100% {
                        width: 20px;
                        height: 20px;
                        opacity: 0.5;
                    }
                    50% {
                        width: 25px;
                        height: 25px;
                        opacity: 1;
                    }
                }
            `}</style>
        <div ref={cursorRef} className="cursor-swirl"></div>

        <div className="max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div className="text-sm opacity-70">
                    {currentDateTime.toLocaleString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}
                </div>
                <h1 className="text-2xl font-bold">DPWS&apos;s space</h1>
                <button onClick={toggleDarkMode} className="p-2 rounded-full bg-gray-800 text-white transition-colors duration-200 hover:bg-gray-700">
                    {isDarkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
                </button>
            </header>

            <main>
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4">To Do</h2>
                    <div className="flex justify-between items-center mb-2">
                        <span>Progress</span>
                        <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="text-right text-sm opacity-70 mt-1">
                        {completedTasks}/{totalTasks} completed
                    </div>
                </div>

                <div className="flex items-center mb-4 space-x-2">
                    <input
                        type="text"
                        placeholder="Add new task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        className="flex-grow bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                    />
                    <input
                        type="text"
                        list="categories"
                        placeholder="Category"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-32 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                    />
                    <datalist id="categories">
                        {categories.map((category, index) => (
                            <option key={index} value={category} />
                        ))}
                    </datalist>
                    <input
                        type="text"
                        list="assignees"
                        placeholder="Assignee"
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        className="w-32 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                    />
                    <datalist id="assignees">
                        {assignees.map((assignee, index) => (
                            <option key={index} value={assignee} />
                        ))}
                    </datalist>
                    <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-40 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 hover:bg-gray-700"
                    >
                        {statuses.map((status, index) => (
                            <option key={index} value={status}>{status}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => addTask()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg transition-colors duration-200 hover:bg-blue-600"
                    >
                        <PlusIcon size={20} />
                    </button>
                </div>

                <div className="space-y-2">
                    {tasks.map(task => renderTask(task))}
                </div>

                <div className="mt-6 flex items-center">
                    <span className="mr-2">{completedToday} completed today</span>
                    <button
                        onClick={resetCompletedToday}
                        className="p-2 bg-gray-700 text-white rounded-lg transition-colors duration-200 hover:bg-gray-600"
                    >
                        <RefreshCwIcon size={16} />
                    </button>
                </div>

                <div className="mt-12 flex justify-between">
                    {renderPieChart(getCategoryData(), "Tasks by Category", 'category')}
                    {renderPieChart(getAssigneeData(), "Tasks by Assignee", 'assignee')}
                    {renderPieChart(getStatusData(), "Tasks by Status", 'status')}
                </div>
            </main>
        </div>
    </div>
)