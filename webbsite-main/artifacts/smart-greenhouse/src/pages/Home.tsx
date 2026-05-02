import img_greenhouse_exterior from "@assets/WhatsApp_Image_2026-04-15_at_14.36.17_1777666560978.jpeg";
import img_signboard from "@assets/WhatsApp_Image_2026-04-15_at_14.35.30_(1)_1777666560970.jpeg";
import img_plantation_activity from "@assets/WhatsApp_Image_2026-04-15_at_14.35.29_1777666560969.jpeg";
import img_planting_close from "@assets/WhatsApp_Image_2026-04-15_at_14.35.31_(1)_1777666560972.jpeg";
import img_faculty_discuss from "@assets/WhatsApp_Image_2026-04-15_at_14.35.31_1777666560973.jpeg";
import img_iot_sensor from "@assets/WhatsApp_Image_2026-04-15_at_14.35.32_(1)_1777666560974.jpeg";
import img_planting_pair from "@assets/WhatsApp_Image_2026-04-15_at_14.35.32_1777666560975.jpeg";
import img_planting_green from "@assets/WhatsApp_Image_2026-04-15_at_14.35.33_(1)_1777666560976.jpeg";
import img_plant_growth from "@assets/WhatsApp_Image_2026-04-15_at_14.35.33_1777666560976.jpeg";
import img_tomato_harvest from "@assets/WhatsApp_Image_2026-04-15_at_14.35.34_1777666560977.jpeg";
import img_team_greenhouse from "@assets/WhatsApp_Image_2026-04-15_at_14.35.30_1777666560971.jpeg";

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ProblemStatement } from "@/components/ProblemStatement";
import { HowItWorks } from "@/components/HowItWorks";
import { Technology } from "@/components/Technology";
import { Services } from "@/components/Services";
import { Gallery } from "@/components/Gallery";
import { Team } from "@/components/Team";
import { CropGrowth } from "@/components/CropGrowth";
import { Results } from "@/components/Results";
import { WhyItMatters } from "@/components/WhyItMatters";
import { Achievements } from "@/components/Achievements";
import { Contact } from "@/components/Contact";

const galleryImages = [
  { src: img_plant_growth, alt: "Tomato seedlings growing in black grow bags inside greenhouse" },
  { src: img_planting_green, alt: "Team planting in green grow bags outdoors" },
  { src: img_plantation_activity, alt: "Faculty and staff plantation activity" },
  { src: img_planting_pair, alt: "Researchers examining seedlings up close" },
  { src: img_greenhouse_exterior, alt: "Smart Greenhouse exterior with fence and LoRaWAN tower" },
  { src: img_signboard, alt: "Smart Green House signboard — Industrial IoT Laboratory" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero backgroundImage={img_greenhouse_exterior} />
        <About signboardImage={img_signboard} />
        <ProblemStatement />
        <HowItWorks
          plantationImage={img_plantation_activity}
          plantingCloseImage={img_planting_close}
        />
        <Technology sensorImage={img_iot_sensor} />
        <Services />
        <Gallery images={galleryImages} />
        <Team
          teamGreenhouseImage={img_team_greenhouse}
          facultyDiscussImage={img_faculty_discuss}
        />
        <CropGrowth
          plantingCloseImage={img_planting_close}
          plantingPairImage={img_planting_pair}
          plantGrowthImage={img_plant_growth}
        />
        <Results harvestImage={img_tomato_harvest} />
        <WhyItMatters />
        <Achievements />
        <Contact />
      </main>
    </div>
  );
}
