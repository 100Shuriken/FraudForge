import { createContext, useContext, useState } from 'react'

const AttackContext = createContext(null)

export function AttackProvider({ children }) {
    const [selectedVector, setSelectedVector] = useState(null)
    const [latestGenerateOutput, setLatestGenerateOutput] = useState(null)
    const [latestLabRun, setLatestLabRun] = useState(null)
    const [latestTraining, setLatestTraining] = useState(null)
    const [judgeMode, setJudgeMode] = useState(false)
    const [beginnerMode, setBeginnerMode] = useState(() => {
        const saved = localStorage.getItem('fraudforge-beginner-mode')
        return saved !== null ? saved === 'true' : true // Default ON for beginners
    })
    const [uiMode, setUiMode] = useState(() => {
        const saved = localStorage.getItem('fraudforge-ui-mode')
        return saved || 'consumer' // Default to simple consumer mode
    })
    const [visitedStages, setVisitedStages] = useState(new Set(['/']))

    const toggleUiMode = (mode) => {
        const next = mode || (uiMode === 'consumer' ? 'technical' : 'consumer')
        setUiMode(next)
        localStorage.setItem('fraudforge-ui-mode', next)
    }

    const toggleBeginnerMode = () => {
        setBeginnerMode(prev => {
            const next = !prev
            localStorage.setItem('fraudforge-beginner-mode', String(next))
            return next
        })
    }

    const addVisitedStage = (path) => {
        setVisitedStages(prev => new Set([...prev, path]))
    }

    return (
        <AttackContext.Provider value={{
            uiMode,
            setUiMode,
            toggleUiMode,
            selectedVector,
            setSelectedVector,
            latestGenerateOutput,
            setLatestGenerateOutput,
            latestLabRun,
            setLatestLabRun,
            latestTraining,
            setLatestTraining,
            judgeMode,
            setJudgeMode,
            beginnerMode,
            setBeginnerMode,
            toggleBeginnerMode,
            visitedStages,
            addVisitedStage,
        }}>
            {children}
        </AttackContext.Provider>
    )
}

export function useAttackContext() {
    const context = useContext(AttackContext)
    if (!context) throw new Error('useAttackContext must be used within AttackProvider')
    return context
}
