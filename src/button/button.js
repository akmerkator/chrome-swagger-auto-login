var element = document.getElementById('swagger-ui')
const domain = new URL(location.href)
var isSwaggerPage = element != null

// only inject the button to pages
// which contain the swagger ui
if (isSwaggerPage) {
    injectLoginButton()
}
// var button, username, password

var username, password, token

// get the saved auth credentials
chrome.storage.sync.get('sal', function (storage) {
    username = storage.sal.username
    password = storage.sal.password
})

// listen for changes to the auth credentials
chrome.storage.onChanged.addListener(function (changes) {
    username = changes.sal.newValue.username
    password = changes.sal.newValue.password
})

/**
 * Inject the Login button to the page.
 */
function injectLoginButton() {
    // inject the button
    var html = document.createElement('div')
    html.innerHTML = '<button id="sal-button" type="button"></button>'
    document.body.appendChild(html)

    button = document.getElementById('sal-button')
    setButtonState('ready')

    // register click handler
    button.onclick = async () => {
        await logIn()
    }
}

// see https://github.com/Totalbug92/AutoAuthSwagger/blob/master/contentScript.js
let isAuthenticated = false;
let isSwaggerDocument = document.getElementById('swagger-ui') ? true : false;
const setAuthKey = async () => {
    let authWrapper;
    const domain = new URL(location.href);
    await chrome.storage.sync.get(({ [domain.hostname]: apiKey }) => {
        apiKey = token
        if (apiKey && !isAuthenticated && isSwaggerDocument) {
            function callback(mut) {
                let form = authWrapper?.querySelector('form');
                let input = form?.querySelector('input');
                let changeEvent = new Event('change', { bubbles: true });
                let buttons = form?.querySelectorAll('button'); // Buttons inside the form element
                if (input) {
                    console.log("input is not null")
                    input.value = 'Bearer ' + apiKey;
                    input.dispatchEvent(changeEvent)
                }
                if (buttons) {
                    console.log("buttons is not null")
                    buttons[0]?.click(); // Auth button
                    buttons[1]?.click(); // close button
                }
                isAuthenticated = true;
            }
            setTimeout(() => {
                authWrapper = document.querySelector('.auth-wrapper')
                let observer = new MutationObserver(callback)
                observer.observe(authWrapper, { childList: true })
                authWrapper.querySelector('button').click()
            }, 500)
        }
    })
}

if (isSwaggerDocument && !isAuthenticated) {
    setAuthKey();
}









/**
 * Perform the login.
 * see https://github.com/swagger-api/swagger-ui/issues/2915
 */
async function logIn() {
    setButtonState('loading')
    const data = {
        "login": username,
        "password": password
    }
    const response = await fetch('/v2/account/login', {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
        .then((response) => response.json())
        .then(data => {
            console.log("done request, got response=" + data.token)
            token = data.token
            setAuthKey();
            setButtonState('ready')
            // // auto set the auth token in the ui
            // var input = document.getElementById('input_apiKey')
            // input.value = 'bearer ' + token

            // // force swagger to register the change
            // var event = new Event('change')
            // input.dispatchEvent(event)
        })
        .catch(error => {
            setButtonState('error')
            throw (error);
        })
}

/**
 * Set the state of the button.
 *
 * @param {String} state
 */
function setButtonState(state) {
    switch (state) {
        case 'ready':
            button.classList.remove('sal-error')
            button.innerHTML = 'Log In'
            break
        case 'loading':
            button.classList.remove('sal-error')
            button.innerHTML = '<div id="sal-spinner"></div>'
            break
        case 'error':
            button.classList.add('sal-error')
            button.innerHTML = 'Try Again'
            break
    }
}
