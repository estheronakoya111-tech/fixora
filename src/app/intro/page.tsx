"use client";

import { useRouter } from "next/navigation";
import Intro from "@/components/landing/Intro";
import { markIntroSeen, setIntroStory } from "@/lib/storage";

// The animated intro lives at /intro so it can always be re-opened (e.g. to
// show someone how the product works). The main app only redirects first-time
// visitors here; pressing "Get started" marks it as seen, so refreshes skip it.
export default function IntroPage() {
  const router = useRouter();

  return (
    <Intro
      onContinue={({ story }) => {
        markIntroSeen();
        if (story) setIntroStory(story);
        router.push("/");
      }}
    />
  );
}
