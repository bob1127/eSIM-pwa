'use client';
import styles from './page.module.scss'
import { projects } from './data';
import Card from './index';
import { useScroll } from 'framer-motion';
import { useRef } from 'react';

export default function Home() {
    const container = useRef(null);
    const { scrollYProgress } = useScroll({
        target: container,
        offset: ['start start', 'end end']
    })

    return (
        <main ref={container} className={styles.main}>
            {
                projects.map((project, i) => {
                    const targetScale = 1 - ((projects.length - i) * 0.05);
                    return <Card  key={`p_${i}`} i={i} {...project} progress={scrollYProgress} range={[i * .25, 1]} targetScale={targetScale} />
                })
            }
        </main>
    )
}
