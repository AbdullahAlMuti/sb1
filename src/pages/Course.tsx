import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseSection from "@/components/CourseSection";
import { Button } from "@/components/ui/button";

const Course = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Keep content aligned with other public pages + improve mobile spacing */}
      <div className="pt-20">
        <div className="container max-w-5xl px-4 py-8 sm:py-10">
          <Link to="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <CourseSection />
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default Course;
