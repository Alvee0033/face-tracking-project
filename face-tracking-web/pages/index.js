import Head from 'next/head';
import styles from '../styles/Home.module.css';
import HolisticTracker from '../components/FaceTracker';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Holistic Tracking UI</title>
        <meta name="description" content="Face, Hand, and Pose tracking with MediaPipe and Next.js" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Holistic Tracking Live
        </h1>

        <p className={styles.description}>
          Face, Hands & Pose Tracking
        </p>

        <HolisticTracker />
      </main>
    </div>
  );
}
