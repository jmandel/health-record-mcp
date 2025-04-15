// Simple Browser Test Runner

// --- Test Registry ---
const testSuites = [];
let currentSuite = null;

// --- Test API (Mimicking Jest/Vitest style) ---
export function describe(name, fn) {
    currentSuite = { name, tests: [] };
    testSuites.push(currentSuite);
    fn(); // Execute the suite function to collect tests
    currentSuite = null;
}

export function test(name, fn, timeout = 15000) { // Added default timeout
    if (!currentSuite) {
        throw new Error('test() must be called inside a describe() block');
    }
    currentSuite.tests.push({ name, fn, timeout });
}

// Add the .skip functionality
test.skip = (name, fn, timeout) => {
    if (!currentSuite) {
        // Still good to check, though it won't be added anyway
        console.warn('test.skip() called outside a describe() block');
        return;
    }
    console.log(`Skipping test: ${currentSuite.name} > ${name}`);
    // Intentionally do not push to currentSuite.tests
};

// Simple assertion library (expand as needed)
export const expect = (actual) => {
    const createSuccessMessage = (matcherName, expected) => {
        let msg = `✅ Assertion Passed: Expect ${JSON.stringify(actual)} .${matcherName}`; 
        if (expected !== undefined) {
            msg += `(${JSON.stringify(expected)})`;
        }
        return msg;
    };
    const createNotSuccessMessage = (matcherName, expected) => {
        let msg = `✅ Assertion Passed: Expect ${JSON.stringify(actual)} .not.${matcherName}`; 
        if (expected !== undefined) {
            msg += `(${JSON.stringify(expected)})`;
        }
        return msg;
    };

    const assertions = {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Assertion failed: Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
            }
            console.log(createSuccessMessage('toBe', expected));
        },
        toBeDefined: () => {
            if (actual === undefined || actual === null) {
                throw new Error(`Assertion failed: Expected value to be defined, but received ${actual}`);
            }
            console.log(createSuccessMessage('toBeDefined'));
        },
        toBeNull: () => {
            if (actual !== null) {
                throw new Error(`Assertion failed: Expected null, but received ${JSON.stringify(actual)}`);
            }
             console.log(createSuccessMessage('toBeNull'));
        },
        toBeInstanceOf: (expectedClass) => {
            if (!(actual instanceof expectedClass)) {
                throw new Error(`Assertion failed: Expected instance of ${expectedClass.name}, but received ${actual?.constructor?.name}`);
            }
            console.log(createSuccessMessage('toBeInstanceOf', expectedClass.name));
        },
        toBeGreaterThan: (expected) => {
            if (!(actual > expected)) {
                throw new Error(`Assertion failed: Expected ${JSON.stringify(actual)} to be greater than ${JSON.stringify(expected)}`);
            }
             console.log(createSuccessMessage('toBeGreaterThan', expected));
        },
        toBeLessThanOrEqual: (expected) => {
            if (!(actual <= expected)) {
                throw new Error(`Assertion failed: Expected ${JSON.stringify(actual)} to be less than or equal to ${JSON.stringify(expected)}`);
            }
            console.log(createSuccessMessage('toBeLessThanOrEqual', expected));
        },
        toContain: (expectedSubstring) => {
            let conditionMet = false;
            if (Array.isArray(actual)) {
                 if (actual.includes(expectedSubstring)) {
                    conditionMet = true;
                }
            } else if (typeof actual === 'string') {
                if (actual.includes(expectedSubstring)) {
                    conditionMet = true;
                }
            } 
            
            if(!conditionMet) {
                if (Array.isArray(actual)) {
                    throw new Error(`Assertion failed: Expected array ${JSON.stringify(actual)} to contain ${JSON.stringify(expectedSubstring)}`);
                } else if (typeof actual === 'string') {
                    throw new Error(`Assertion failed: Expected string "${actual}" to contain "${expectedSubstring}"`);
                } else {
                    throw new Error(`Assertion failed: .toContain expected string or array, but received ${typeof actual}`);
                }
            }
             console.log(createSuccessMessage('toContain', expectedSubstring));
        },
        toHaveLength: (expectedLength) => {
            if (!actual || typeof actual.length !== 'number' || actual.length !== expectedLength) {
                throw new Error(`Assertion failed: Expected length ${expectedLength}, but received length ${actual?.length}`);
            }
            console.log(createSuccessMessage('toHaveLength', expectedLength));
        },
        toBeOneOf: (expectedValues) => {
            if (!Array.isArray(expectedValues) || !expectedValues.includes(actual)) {
                throw new Error(`Assertion failed: Expected ${JSON.stringify(actual)} to be one of ${JSON.stringify(expectedValues)}`);
            }
            console.log(createSuccessMessage('toBeOneOf', expectedValues));
        },
    };

    // Add the .not chain
    const negatedAssertions = {};
    for (const key in assertions) {
        if (typeof assertions[key] === 'function') {
            // Use original args for logging in the .not case
            negatedAssertions[key] = (...args) => {
                let didThrow = false;
                try {
                    assertions[key](...args);
                    // If original didn't throw, log it BEFORE throwing the .not error
                    // This log won't appear in the final page render if it throws after, but will be in console.
                    console.log(`Original assertion .${key} passed (which is expected failure for .not)`);
                } catch (e) {
                    didThrow = true; // Assertion failed as expected for .not
                }
                if (!didThrow) {
                    // If the original assertion passed, the .not assertion fails
                    throw new Error(`Assertion failed: Expected assertion .${key} to fail (due to .not), but it passed.`);
                }
                 // If the original assertion threw (didThrow is true), the .not assertion passed.
                 console.log(createNotSuccessMessage(key, args.length > 0 ? args[0] : undefined));
            };
        }
    }

    return { ...assertions, not: negatedAssertions };
};

// --- DOM Interaction ---
const resultsDiv = document.getElementById('results');
const summaryDiv = document.getElementById('testSummary');
const runButton = document.getElementById('runTestsButton');

function logToPage(message, level = 'log') {
    const entry = document.createElement('div');
    entry.textContent = `[${level.toUpperCase()}] ${message}`;
    resultsDiv.appendChild(entry);
    resultsDiv.scrollTop = resultsDiv.scrollHeight; // Scroll to bottom
}

function renderTestResult(suiteName, testName, passed, error = null, logs = []) {
    const testCaseDiv = document.createElement('div');
    testCaseDiv.classList.add('test-case');

    const statusSpan = document.createElement('span');
    statusSpan.classList.add('test-status');
    statusSpan.textContent = passed ? 'PASS' : 'FAIL';
    statusSpan.classList.add(passed ? 'test-pass' : 'test-fail');

    const titleDiv = document.createElement('div');
    titleDiv.classList.add('test-title');
    titleDiv.textContent = `${suiteName} > ${testName}`;

    testCaseDiv.appendChild(statusSpan);
    testCaseDiv.appendChild(titleDiv);

    // Add captured logs
    if (logs.length > 0) {
        logs.forEach(log => {
            const logDiv = document.createElement('div');
            logDiv.classList.add('test-log');
            // Basic attempt to stringify non-strings
            const logContent = typeof log === 'string' ? log : JSON.stringify(log, null, 2);
            logDiv.textContent = logContent;
            testCaseDiv.appendChild(logDiv);
        });
    }

    if (error) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('error-details');
        errorDiv.textContent = error.stack ? error.stack : error.message;
        testCaseDiv.appendChild(errorDiv);
    }

    resultsDiv.appendChild(testCaseDiv);
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
}

// --- Test Execution ---
let totalTestsPlanned = 0;
let totalTestsRunSoFar = 0;
let passedTests = 0;
let failedTests = 0;

// NEW: Function to update the summary display
function updateSummaryDisplay() {
    if (totalTestsRunSoFar < totalTestsPlanned) {
        summaryDiv.textContent = `Running (${totalTestsRunSoFar}/${totalTestsPlanned}): ${passedTests} passed, ${failedTests} failed...`;
    } else {
        summaryDiv.textContent = `Test Run Complete: ${passedTests} passed, ${failedTests} failed (${totalTestsPlanned} total).`;
    }
}

async function runTests() {
    console.log('Starting test execution...');
    resultsDiv.innerHTML = ''; // Clear previous results
    runButton.disabled = true;

    // Reset counters
    totalTestsPlanned = 0;
    totalTestsRunSoFar = 0;
    passedTests = 0;
    failedTests = 0;

    // Calculate total planned tests first
    testSuites.forEach(suite => {
        totalTestsPlanned += suite.tests.length;
    });

    // Initial summary display
    updateSummaryDisplay(); 

    for (const suite of testSuites) {
        console.log(`\n--- Running Suite: ${suite.name} ---`);
        logToPage(`--- Running Suite: ${suite.name} ---`, 'info');
        for (const testCase of suite.tests) {
            totalTestsRunSoFar++; // Increment before running the test
            const capturedLogs = [];
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                originalConsoleLog.apply(console, args);
                capturedLogs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
            };

            console.log(`Running test: ${testCase.name}`);
            // Update summary immediately before test run starts
            updateSummaryDisplay(); 
            
            let passed = false;
            let error = null;
            let timedOut = false;
            const timeoutPromise = new Promise((_, reject) =>
                 setTimeout(() => {
                     timedOut = true;
                     reject(new Error(`Test timed out after ${testCase.timeout}ms`));
                 }, testCase.timeout)
             );

            try {
                 await Promise.race([
                     testCase.fn(),
                     timeoutPromise
                 ]);
                if (!timedOut) {
                    passed = true;
                    // MOVED: Incrementing passedTests happens in finally
                    console.log(`Test PASSED: ${testCase.name}`);
                }
            } catch (err) {
                error = err;
                // MOVED: Incrementing failedTests happens in finally
                console.error(`Test FAILED: ${testCase.name}`, err);
            } finally {
                 console.log = originalConsoleLog; // Restore console log
                 
                 // Increment pass/fail counters HERE
                 if (passed) {
                     passedTests++;
                 } else {
                     failedTests++;
                 }

                 renderTestResult(suite.name, testCase.name, passed, error, capturedLogs);
                 // Update summary display AFTER processing the result
                 updateSummaryDisplay(); 
            }
        }
    }

    console.log(`\n--- Test Summary ---`);
    console.log(`Total: ${totalTestsPlanned}, Passed: ${passedTests}, Failed: ${failedTests}`);
    // REMOVED: Final summary update here, it's handled by the last call in the loop
    // summaryDiv.textContent = `Test Run Complete: ${passedTests} passed, ${failedTests} failed (${totalTestsPlanned} total).`;
    runButton.disabled = false;
}

// --- Import and Run Tests ---
async function main() {
    // Dynamically import all test files
    // Adjust the path according to your build process/server setup
    // Import the renamed .ts file
    await import('./a2aClient.browser.test.ts'); 
    await import('./TaskLiaison.integration.test.ts'); 
    // await import('./taskLiaison.browser.test.js'); // Uncomment when ready

    runButton.addEventListener('click', runTests);

    // Optional: Run tests automatically on load
    // await runTests();
    summaryDiv.textContent = `Ready to run ${testSuites.reduce((acc, s) => acc + s.tests.length, 0)} tests.`;
}

main().catch(err => {
    console.error("Error during test runner setup:", err);
    summaryDiv.textContent = 'Error setting up test runner.';
    logToPage(`Setup Error: ${err.message}`, 'error');
}); 