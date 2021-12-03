import React from 'react'
import BaseContentLayout from '../../../components/BaseContentLayout/BaseContentLayout'
import StepTwoForm from './StepTwoForm'

class OnboardingStepTwo extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        income: '',
        other: '',
        unofficial: '',
        expenses: '',
        dependants: '',
        formErrors: true
      }

      this.handleInputChange = this.handleInputChange.bind(this)
      this.validateForm = this.validateForm.bind(this)
      this.onSubmit = this.onSubmit.bind(this)
    }

    handleInputChange(event) {
        const { name, value  } = event.target
        this.setState({ [name]: value }, this.validateForm)
    }

    validateForm() {
        const { income, other, unofficial, expenses, dependants } = this.state

        const isValid = income > 0
        && other > 0
        && unofficial > 0
        && expenses > 0
        && dependants > 0

        this.setState({ formErrors: !isValid })
    }

    onSubmit() {
        !this.state.formErrors && this.props.onNext()
    }

    render() {
        return (
            <BaseContentLayout  {...{
                submitButtonProps: {
                  onClick: this.onSubmit,
                  disabled: this.state.formErrors
                },
                progress: this.props.progress
              }} >

                <div>
                    <h1>{this.props.label}</h1>

                    <StepTwoForm onChange={this.handleInputChange} />
                </div> 

            </BaseContentLayout>
        )
    }
}

export default OnboardingStepTwo
