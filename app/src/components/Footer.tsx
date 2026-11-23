// The page's closing bar — mirrors the header: a white strip with a thick
// black rule separating it from the content.

// Hidden until there are regular users; flip to true to show the button.
const SHOW_DONATE = false
// TODO: replace with the real Buy Me a Coffee page.
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/'

function Footer() {
  return (
    <footer className="mt-auto bg-white py-20 border-t-3">
      <div className="container flex justify-center">
        {SHOW_DONATE && (
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="main-btn bg-main-yellow font-title font-bold uppercase px-15 py-10"
          >
            ☕ Κέρασέ με έναν καφέ
          </a>
        )}
      </div>
    </footer>
  )
}

export default Footer
