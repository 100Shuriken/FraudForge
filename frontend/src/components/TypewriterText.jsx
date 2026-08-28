import { useState, useEffect } from 'react'

/**
 * Typewriter effect that reveals characters smoothly over 1.2–1.8 seconds regardless of length.
 */
export default function TypewriterText({ text, speedMs = 15, onComplete }) {
    const [displayedLength, setDisplayedLength] = useState(0)

    useEffect(() => {
        if (!text) {
            setDisplayedLength(0)
            return
        }

        setDisplayedLength(0)
        const totalChars = text.length
        // Target total duration ~1200ms
        const stepSize = Math.max(1, Math.ceil(totalChars / 80))
        const intervalTime = Math.max(12, Math.floor(1200 / (totalChars / stepSize)))

        const interval = setInterval(() => {
            setDisplayedLength(prev => {
                const next = prev + stepSize
                if (next >= totalChars) {
                    clearInterval(interval)
                    if (onComplete) onComplete()
                    return totalChars
                }
                return next
            })
        }, intervalTime)

        return () => clearInterval(interval)
    }, [text])

    const isTyping = displayedLength < (text?.length || 0)

    return (
        <span>
            {text?.slice(0, displayedLength)}
            {isTyping && (
                <span className="inline-block w-1.5 h-4 bg-signal-cyan ml-0.5 animate-pulse align-middle" />
            )}
        </span>
    )
}
