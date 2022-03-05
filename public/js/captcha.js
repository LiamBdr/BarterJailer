/**
 * The callback function executed
 * once all the Google dependencies have loaded
 */
function onGoogleReCaptchaApiLoad() {
    let widgets = document.querySelectorAll('[data-toggle="recaptcha"]');
    for (let i = 0; i < widgets.length; i++) {
        renderReCaptcha(widgets[i]);
    }
}

/**
 * Render the given widget as a reCAPTCHA
 * from the data-type attribute
 */
function renderReCaptcha(widget) {
    let form = widget.closest('form');
    let widgetType = widget.getAttribute('data-type');
    let widgetParameters = {
        'sitekey': '6LfguKweAAAAAA7Nxt6s9TzIV5n7PGvgwkLmjdbC'
    };

    let widgetId = grecaptcha.render(widget, widgetParameters);
}
