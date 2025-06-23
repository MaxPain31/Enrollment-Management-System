document.addEventListener("DOMContentLoaded", () => {
    const burger = document.querySelector(".burger");
    const navLinks = document.querySelector(".nav-links");

    burger.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        burger.classList.toggle("toggle");
    });

    const birthDateInput = document.getElementById("birth_date");
    const ageInput = document.getElementById("age");

    birthDateInput.addEventListener("change", function () {
        const birthDate = new Date(this.value);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (!isNaN(age)) {
            ageInput.value = age;
        } else {
            ageInput.value = "";
        }
    });
});
