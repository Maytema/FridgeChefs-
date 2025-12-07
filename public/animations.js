import { gsap } from "https://cdn.skypack.dev/gsap@3.12.2";

export function initAnimations() {
    // Initialize particles
    initParticles();
    
    // Initialize tilt effect for chips
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".chip"), {
            max: 15,
            speed: 400,
            glare: true,
            "max-glare": 0.2
        });
    }
    
    // Animate hero elements
    gsap.from(".logo", {
        duration: 1.5,
        y: -50,
        opacity: 0,
        ease: "bounce.out"
    });
    
    gsap.from(".slogan", {
        duration: 1,
        y: 30,
        opacity: 0,
        delay: 0.5,
        ease: "power3.out"
    });
    
    gsap.from(".search-container", {
        duration: 1,
        y: 30,
        opacity: 0,
        delay: 0.8,
        ease: "power3.out"
    });
    
    // Floating animation for chips
    gsap.to(".chip", {
        y: () => Math.random() * 10 - 5,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.1
    });
    
    // Hover effect for recipe cards
    document.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                scale: 1.05,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                scale: 1,
                duration: 0.3,
                ease: "power2.out"
            });
        });
    });
    
    // Search input focus effect
    const searchInput = document.getElementById('productSearch');
    searchInput.addEventListener('focus', () => {
        gsap.to(searchInput, {
            scale: 1.02,
            boxShadow: "0 0 30px rgba(251, 191, 36, 0.4)",
            duration: 0.3
        });
    });
    
    searchInput.addEventListener('blur', () => {
        gsap.to(searchInput, {
            scale: 1,
            boxShadow: "none",
            duration: 0.3
        });
    });
}

function initParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 30;
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Food emojis for particles
    const foodEmojis = ['🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍦', '🍩', '🍪', '🍎', '🍇', '🥑', '🥦', '🧀', '🥚'];
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
            size: Math.random() * 20 + 15,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 2 - 1
        });
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            // Update position
            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;
            
            // Bounce off edges
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
            
            // Draw emoji
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.font = `${p.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.3;
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Particle burst effect for AI button
export function createParticleBurst(x, y) {
    const particles = [];
    const colors = ['#FBBF24', '#EC4899', '#6366F1', '#10B981'];
    
    for (let i = 0; i < 30; i++) {
        particles.push({
            x,
            y,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 5 + 2,
            speedX: Math.random() * 6 - 3,
            speedY: Math.random() * 6 - 3,
            life: 100
        });
    }
    
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, i) => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.life -= 2;
            p.speedY += 0.1; // gravity
            
            if (p.life > 0) {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 100;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                particles.splice(i, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateParticles();
}

// Explode animation for chip removal
export function explodeChip(chip) {
    const rect = chip.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    gsap.to(chip, {
        scale: 2,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => chip.remove()
    });
    
    // Add mini particles
    createMiniExplosion(x, y);
}

function createMiniExplosion(x, y) {
    const particles = [];
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    
    for (let i = 0; i < 15; i++) {
        particles.push({
            x,
            y,
            color: '#EC4899',
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 4 - 2,
            speedY: Math.random() * 4 - 2,
            life: 50
        });
    }
    
    function animate() {
        particles.forEach((p, i) => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.life--;
            
            if (p.life > 0) {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 50;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                particles.splice(i, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}
