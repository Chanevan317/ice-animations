// Constants and Initial Setup
const svg = d3.select("#signal-plot");
const width = +svg.attr("width");
const height = +svg.attr("height");
const colors = ['#2196F3', '#4CAF50', '#FFC107', '#E91E63', '#9C27B0', '#00BCD4'];
const margin = { top: 30, right: 30, bottom: 30, left: 40 };

let numUsers = 1;
const h = (height - 75);
const totalChannelHeight = height - 75;
const totalBandwidth = 15; // Total channel bandwidth
let isFrequencySpectrumVisible = false;
let isFHSSMode = false;

// Scales
const xScale = d3.scaleLinear()
  .domain([0, 7]) // Time slots (T0 - T7)
  .range([margin.left, width - margin.right]);

const yScale = d3.scaleLinear()
  .domain([1, 8]) // Frequencies (F1 - F6)
  .range([h - margin.bottom, margin.top]);

// FHSS Data
let fhssPattern = [];

// Add borders
svg.style("border", "2px solid #F5F5F577");

// Helper Functions
function generateSineWave(frequency, amplitude, phase, centerY) {
    const maxX = width - 120; // Limit the sine wave to the available width of the channel
    const points = d3.range(0, maxX, 1).map(x => { 
        const y = centerY + amplitude * Math.sin(0.02 * frequency * x + phase);
        return [x, y];
    });
    return points;
}

function generateFrequencySpectrum() {
    const spectrum = [];
    const guardbandWidth = totalBandwidth * 0.02; // Set guardband width as 2% of total bandwidth
    const usableBandwidth = totalBandwidth - guardbandWidth * (numUsers - 1); // Reduce usable bandwidth
    const bandwidthPerUser = usableBandwidth / numUsers; // Divide usable bandwidth among users

    for (let i = 0; i < numUsers; i++) {
        const startFreq = i * (bandwidthPerUser + guardbandWidth);
        const endFreq = startFreq + bandwidthPerUser;
        spectrum.push({ startFreq, endFreq });
    }

    return spectrum;
}

// Frequency Spectrum Functions
function createFrequencyAxis() {
    // Remove existing axis if present
    svg.selectAll(".axis").remove();

    // Create a group to hold the axes
    const axisGroup = svg.append("g")
        .attr("transform", "translate(60, 10)");  // Position the axes

    // X-axis
    const xScale = d3.scaleLinear()
        .domain([0, numUsers]) // Scale based on the number of users
        .range([0, width - 90]); // Full width minus modulator/demodulator space

    const xAxis = d3.axisBottom(xScale)
        .ticks(0)  // Remove all ticks
        .tickFormat(() => ""); // Remove all labels
    
    axisGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${h - 80})`) // Position the X axis at the bottom
        .call(xAxis);

    // X-axis label
    svg.append("text")
        .attr("x", (width + 30) / 2)
        .attr("y", h - 20)
        .attr("text-anchor", "middle")
        .text("Frequencies") // Label for X-axis
        .attr("fill", "#fff")
        .attr("font-size", "14px");

    // Y-axis
    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([h - 80, 20]); // Scale for Y axis from bottom to top

    const yAxis = d3.axisLeft(yScale)
        .ticks(2) // Only show 0 and 1 on the Y-axis
        .tickFormat(() => "")

    axisGroup.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

    // Y-axis label
    svg.append("text")
        .attr("x", 10)
        .attr("y", h / 2)
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90, 30, ${h / 2})`)
        .text("Amplitude") // Label for Y-axis
        .attr("fill", "#fff")
        .attr("font-size", "14px");
}

// FDM Visualization Functions
function drawFDMVisualization() {
    svg.selectAll("*").remove(); // Clear the existing  visualization

    // Only show modulator and demodulator blocks if not in frequency spectrum mode
    if (!isFrequencySpectrumVisible) {
        // Create modulator and demodulator blocks

        svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 60)
            .attr("height", h)
            .attr("fill", "#252525")
            .attr("stroke", "2px solid #F5F5F577");

        svg.append("text")
            .attr("x", 30)
            .attr("y", h / 2)
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(-90, 30, ${h / 2})`)
            .text("MODULATOR")
            .attr("fill", "#fff");

        svg.append("rect")
            .attr("x", width - 60)
            .attr("y", 0)
            .attr("width", 60)
            .attr("height", h)
            .attr("fill", "#252525")
            .attr("stroke", "2px solid #F5F5F577");

        svg.append("text")
            .attr("x", width - 30)
            .attr("y", h / 2)
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(90, ${width - 30}, ${h / 2})`)
            .text("DEMODULATOR")
            .attr("fill", "#fff");
    }

    // If the frequency spectrum is visible, show the frequency spectrum with triangles and guard bands
    if (isFrequencySpectrumVisible) {
        createFrequencyAxis(); // Draw the frequency axis (you can adjust this based on your needs)

        const spectrum = generateFrequencySpectrum();
        const spectrumGroup = svg.append("g")
            .attr("transform", "translate(60, 10)");

        // Draw the frequency pulses (triangles) for each user
        spectrumGroup.selectAll("path.user-frequency")
            .data(spectrum)
            .enter()
            .append("path")
            .attr("d", d => {
                const startX = (d.startFreq / totalBandwidth) * (width - 90); // Left edge of the frequency range
                const endX = (d.endFreq / totalBandwidth) * (width - 90); // Right edge of the frequency range
                const midX = (startX + endX) / 2; // Center of the frequency range
                const baseY = h - 80; // Base of the half-oval
                const topY = 20; // Peak of the half-oval (vertical position)

                // Use an SVG path to create the half-oval
                return `
                    M ${startX},${baseY} 
                    Q ${midX},${topY} ${endX},${baseY} 
                    Z
                `;
            })
            .attr("fill", (d, i) => colors[i % colors.length]) // Different color for each user
            .attr("stroke-width", 1);

        // Add labels or ticks on the frequency spectrum
        spectrumGroup.selectAll("text")
            .data(spectrum)
            .enter()
            .append("text")
            .attr("x", d => (d.startFreq / totalBandwidth) * (width - 90) + ((d.endFreq - d.startFreq) / totalBandwidth) * (width - 90) / 2) // Positioning the text at the center of the pulse
            .attr("y", h - 60)
            .attr("text-anchor", "middle")
            .text((d, i) => `User ${i + 1}`)
            .attr("fill", "#fff")
            .attr("font-size", "12px");
        
    } else {
        // Create frequency channels and sine waves when spectrum is not visible
        const channels = svg.append("g").attr("transform", "translate(60, 0)");

        const channelHeight = totalChannelHeight / numUsers; // Divide total height by number of users
        const bandwidthPerUser = totalBandwidth / numUsers; // Divide total bandwidth among users
        const amplitude = channelHeight * 0.3;

        for (let i = 0; i < numUsers; i++) {
            const centerY = (i + 0.5) * channelHeight;
            const frequency = bandwidthPerUser * (i + 1); // Dynamically allocate frequency

            // Background for the channel
            channels.append("rect")
                .attr("x", 0)
                .attr("y", i * channelHeight)
                .attr("width", width - 120)
                .attr("height", channelHeight)
                .attr("fill", "#000000")
                .attr("stroke", "#ddd");

            // Sine wave animation
            const sinePath = channels.append("path")
                .datum(generateSineWave(frequency, amplitude, 0, centerY))
                .attr("fill", "none")
                .attr("stroke", colors[i % colors.length])
                .attr("stroke-width", 2);

            // Animate sine wave
            d3.timer(elapsed => {
                const phase = -elapsed * 0.005; // Negative phase for right-to-left motion
                sinePath.datum(generateSineWave(frequency, amplitude, phase, centerY))
                    .attr("d", d3.line()
                        .x(d => d[0])
                        .y(d => d[1])
                    );
            });
        }
    }
}

function generateFHSSPattern() {
    fhssPattern = [];
    for (let t = 0; t < 8; t++) {
        const selectedFrequency = document.getElementById(`T${t}`).value;
        if (selectedFrequency) {
            // Add vertical transition point if this isn't the first point
            if (fhssPattern.length > 0) {
                fhssPattern.push({ 
                    time: t, 
                    frequency: fhssPattern[fhssPattern.length - 1].frequency 
                });
            }
            fhssPattern.push({ 
                time: t, 
                frequency: +selectedFrequency 
            });
            
            // Add end point for last segment if this is the last valid frequency
            if (t === 7 || !document.getElementById(`T${t + 1}`).value) {
                fhssPattern.push({ 
                    time: t + 1, 
                    frequency: +selectedFrequency 
                });
            }
        }
    }
    updateVisualization();
}

function drawFHSSPattern() {
    // Draw time slots (X-axis)
    svg.append("g")
        .attr("transform", `translate(0, ${h - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(8).tickFormat((d, i) => `T${i}`));

    // Draw frequencies (Y-axis)
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).ticks(8).tickFormat((d, i) => `F${i + 1}`)); // Updated tick format

    // Plot FHSS pattern with line
    if (fhssPattern.length > 0) {
        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.time))
            .y(d => yScale(d.frequency))
            .curve(d3.curveLinear); // Use linear curve for sharp corners

        // Draw the line
        svg.append('path')
            .datum(fhssPattern)
            .attr('fill', 'none')
            .attr('stroke', '#2196F3')
            .attr('stroke-width', 2)
            .attr('d', line);

        // Add points at frequency changes
        svg.selectAll('.frequency-point')
            .data(fhssPattern.filter(p => !p.isTransition))
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.time))
            .attr('cy', d => yScale(d.frequency))
            .attr('r', 4)
            .attr('fill', '#2196F3');
    }
}

// Keep the clear function as is
function clearFHSSPattern() {
    fhssPattern = [];
    for (let t = 0; t < 8; t++) {
        document.getElementById(`T${t}`).value = "";
    }
    updateVisualization();
}

// Mode Toggle Functions
function toggleMode() {
    isFHSSMode = !isFHSSMode;
    const fdmBox = document.getElementById("fdm-box");
    const fhssBox = document.getElementById("fhss-box");
    const fdmInfoBox = document.getElementById("fdmInfo-box");
    const frqButton = document.getElementById("frq-btn");
    
    if (isFHSSMode) {
        // When in FHSS mode, show FHSS elements and hide FDM elements
        fhssBox.classList.remove("hidden");
        fdmBox.classList.add("hidden");
        fdmInfoBox.classList.add("hidden");
        frqButton.classList.add("hidden");
    } else {
        // When in FDM mode, show FDM elements and hide FHSS elements
        fdmBox.classList.remove("hidden");
        fdmInfoBox.classList.remove("hidden");
        fhssBox.classList.add("hidden");
        frqButton.classList.remove("hidden");
    }

    updateVisualization(); // Make sure to update the visualization after toggling
}

// Main Update Function
function updateVisualization() {
  svg.selectAll("*").remove(); // Clear existing content

  if (isFHSSMode) {
    drawFHSSPattern(); // Visualize FHSS pattern
  } else {
    drawFDMVisualization(); // Your FDM visualization logic here
  }
}

// Event Listeners
document.getElementById("user-slider").addEventListener("input", function () {
    numUsers = +this.value;
    document.getElementById("user-value").textContent = numUsers;
    updateVisualization();
});

document.getElementById("frq-btn").addEventListener("click", function () {
    isFrequencySpectrumVisible = !isFrequencySpectrumVisible; // Toggle flag
    if(isFrequencySpectrumVisible){
        document.getElementById("frq-btn").textContent = "Hide Frequency Band Allocation";
    } else {
        document.getElementById("frq-btn").textContent = "Show Frequency Band Allocation";
    }
    updateVisualization();
});

document.getElementById("generate-pattern").addEventListener("click", generateFHSSPattern);
document.getElementById("clear-pattern").addEventListener("click", clearFHSSPattern);
document.getElementById("mode-btn").addEventListener("click", toggleMode);

// Initialize
updateVisualization();