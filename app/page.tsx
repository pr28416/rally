"use client";

import { Button } from "@/components/ui/button";

export default function Home() {
  const handleTriggerRoute = async () => {
    const response = await fetch("/script/generate/api", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello World" }),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      <Button onClick={handleTriggerRoute}>Trigger route</Button>
    </div>
  );
}
