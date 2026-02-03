import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseSection from "@/components/CourseSection";

const Course = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <CourseSection />
      </div>
      <Footer />
    </main>
  );
};

export default Course;
