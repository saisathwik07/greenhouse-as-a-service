/**
 * Port of webbsite-main/artifacts/smart-greenhouse/src/pages/Home.tsx
 * as plain JSX for the GAAS public route only.
 */
import LandingNavbar from "./LandingNavbar";
import LandingHero from "./LandingHero";
import LandingAbout from "./LandingAbout";
import LandingProblem from "./LandingProblem";
import LandingHow from "./LandingHow";
import LandingTechnology from "./LandingTechnology";
import LandingServices from "./LandingServices";
import LandingGallery from "./LandingGallery";
import LandingTeam from "./LandingTeam";
import LandingCropGrowth from "./LandingCropGrowth";
import LandingResults from "./LandingResults";
import LandingWhy from "./LandingWhy";
import LandingAchievements from "./LandingAchievements";
import LandingContact from "./LandingContact";
import { LANDING_IMG, GALLERY_IMAGES } from "./assetPaths";

export default function LandingHome() {
  return (
    <div className="min-h-screen bg-background font-display text-foreground">
      <LandingNavbar />
      <main>
        <LandingHero backgroundImage={LANDING_IMG.greenhouseExterior} />
        <LandingAbout signboardImage={LANDING_IMG.signboard} />
        <LandingProblem />
        <LandingHow plantationImage={LANDING_IMG.plantation} plantingCloseImage={LANDING_IMG.plantingClose} />
        <LandingTechnology sensorImage={LANDING_IMG.iotSensor} />
        <LandingServices />
        <LandingGallery images={GALLERY_IMAGES} />
        <LandingTeam
          teamGreenhouseImage={LANDING_IMG.teamGreenhouse}
          facultyDiscussImage={LANDING_IMG.facultyDiscuss}
        />
        <LandingCropGrowth
          plantingCloseImage={LANDING_IMG.plantingClose}
          plantingPairImage={LANDING_IMG.plantingPair}
          plantGrowthImage={LANDING_IMG.plantGrowth}
        />
        <LandingResults harvestImage={LANDING_IMG.tomatoHarvest} />
        <LandingWhy />
        <LandingAchievements />
        <LandingContact />
      </main>
    </div>
  );
}
