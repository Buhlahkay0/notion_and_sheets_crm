document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();

    const saveAllOptions = () => saveOptions();
    const inputsToSave = ['website-url', 'name', 'subject', 'number', 'body'];
    inputsToSave.forEach(id => document.getElementById(id).addEventListener('input', saveAllOptions));

    document.querySelectorAll('input[name="email-format"]').forEach(radio => {
        radio.addEventListener('change', saveAllOptions);
    });

    const getInputValues = () => {
        const websiteURL = document.getElementById('website-url').value;
        const name = document.getElementById('name').value;
        const subject = document.getElementById('subject').value;
        const number = document.getElementById('number').value;
        const body = document.getElementById('body').value.replace(/\n/g, '<br>'); // Convert newlines to breaks
        const emailFormat = document.querySelector('input[name="email-format"]:checked').value;
        const [firstName, lastName] = name.split(' ');

        return { websiteURL, name, firstName, lastName, subject, number, body, emailFormat };
    };

    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', event => {
            const { websiteURL, firstName, lastName } = getInputValues();
            const emailFormat = event.target.getAttribute('data-format');
            const emailAddress = generateEmailAddress(websiteURL, firstName, lastName, emailFormat);

            navigator.clipboard.writeText(emailAddress).then(() => {
                document.getElementById('status').textContent = 'Email copied to clipboard';
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    });

    document.getElementById('fill-email').addEventListener('click', async () => {
        const { websiteURL, firstName, lastName, subject, number, body, emailFormat } = getInputValues();
        const emailAddress = generateEmailAddress(websiteURL, firstName, lastName, emailFormat);
        const emailBody = `${body}<br>${generateImageTag(emailAddress, number, websiteURL)}`;

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const activeTabId = tabs[0].id;

            fillEmail(activeTabId, emailAddress, subject, emailBody);

            document.getElementById('status').textContent = 'Email filled';
        });
    });

    document.getElementById('clear-fields').addEventListener('click', clearOptions);

    document.getElementById('copy-emails').addEventListener('click', function () {
        const { websiteURL, firstName, lastName } = getInputValues();

        const emailFormats = [
            "{first}.{last}@url.com",
            "{first}{last}@url.com",
            "{first}@url.com",
            "{last}@url.com",
            "{first}{last_i}@url.com",
            "{first_i}{last}@url.com"
        ];

        const emails = emailFormats.map(format => generateEmailAddress(websiteURL, firstName, lastName, format));
        const formattedText = emails.join('\n');

        navigator.clipboard.writeText(formattedText).then(() => {
            document.getElementById('status').textContent = 'Copied Addresses';
        }).catch(err => {
            console.error('Failed to copy email formats: ', err);
        });
    });
});


function saveOptions() {
    const websiteURL = document.getElementById('website-url').value;
    const name = document.getElementById('name').value;
    const subject = document.getElementById('subject').value;
    const number = document.getElementById('number').value;
    const body = document.getElementById('body').value;
    const emailFormat = document.querySelector('input[name="email-format"]:checked').value;

    chrome.storage.local.set({ websiteURL, name, subject, number, body, emailFormat });
}

function clearOptions() {
    document.getElementById('website-url').value = '';
    document.getElementById('name').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('number').value = '';
    document.getElementById('body').value = '';
    document.querySelector('input[name="email-format"][value="{first}.{last}@url.com"]').checked = true;

    chrome.storage.local.remove(['websiteURL', 'name', 'subject', 'number', 'body', 'emailFormat']);
}

function generateEmailAddress(websiteURL, firstName, lastName, emailFormat) {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';

    const email = emailFormat
        .replace('{first_i}', firstInitial)
        .replace('{last_i}', lastInitial)
        .replace('{first}', firstName)
        .replace('{last}', lastName)
        .replace('url.com', websiteURL)
        .toLowerCase();

    return email;
}

function generateImageTag(email, number, websiteURL) {
    const trackingURL = generateTrackingURL('http://dj.blakegabriel.com/read', {
        id: email,
        num: number
    });
    return `<img src='${trackingURL}'>`;
}

function generateTrackingURL(baseURL, params) {
    return `${baseURL}?${new URLSearchParams(params).toString()}`;
}

function fillEmail(tabId, email, subject, body) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (email, subject, body) => {
            const recipientField = document.querySelector('div[aria-label="To"][contenteditable="true"]');
            if (recipientField) {
                recipientField.innerText = email;
            } else {
                console.error('Recipient field not found');
            }

            const subjectField = document.querySelector('input[aria-label="Add a subject"]');
            if (subjectField) {
                subjectField.value = subject;
                console.log("subjectField value:", subjectField.value);

                const inputEvent = new Event('input', { bubbles: true });
                subjectField.dispatchEvent(inputEvent);
            } else {
                console.error('Subject field not found');
            }

            const bodyField = document.querySelector('div.elementToProof');
            if (bodyField) {
                bodyField.innerHTML = body;
            } else {
                console.error('Body field not found');
            }
        },
        args: [email, subject, body.replace(/\n/g, '<br>')] // Convert newlines to breaks
    });
}

function restoreOptions() {
    chrome.storage.local.get(['websiteURL', 'name', 'subject', 'body', 'number', 'emailFormat'], (items) => {
        if (items.websiteURL) document.getElementById('website-url').value = items.websiteURL;
        if (items.name) document.getElementById('name').value = items.name;
        if (items.subject) document.getElementById('subject').value = items.subject;
        if (items.number) document.getElementById('number').value = items.number;
        if (items.body) document.getElementById('body').value = items.body;
        if (items.emailFormat) {
            document.querySelector(`input[name="email-format"][value="${items.emailFormat}"]`).checked = true;
        }
    });
}
