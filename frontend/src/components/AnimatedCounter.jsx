export default function AnimatedCounter({ value, target, decimals = 1, suffix = '', durationMs, duration = 800 }) {
    const raw = value !== undefined ? value : target
    const numericTarget = typeof raw === 'number' ? raw : parseFloat(raw) || 0
    const [count, setCount] = useState(0)
    const effectiveDuration = durationMs || duration

    useEffect(() => {
        let startTime = null
        let animationFrameId

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime
            const progress = Math.min((currentTime - startTime) / effectiveDuration, 1)
            // Ease-out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3)
            setCount(easeProgress * numericTarget)

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate)
            }
        }

        animationFrameId = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationFrameId)
    }, [numericTarget, effectiveDuration])

    return (
        <span>
            {count.toFixed(decimals)}{suffix}
        </span>
    )
}
